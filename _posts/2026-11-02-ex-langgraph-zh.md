---
layout: post
title: "用 Go 写一个 LangGraph 式智能体，再交给小模型跑"
summary: "模型调用工具，我们执行，把结果交回去，再问一次。这个循环我用 Go 和 Eino 自己写了一遍。然后把它交给笔记本上运行的 3b 模型，记下了它在哪儿栽跟头、代码又是怎么把它扶住的。"
image: /img/og/ex-langgraph-zh.png
image_alt: "用 Go 写一个 LangGraph 式智能体，再交给小模型跑"
category: 开发
lang: zh
ref: ex-langgraph
permalink: /zh/posts/ex-langgraph/
---

<dl class="facts">
  <div><dt>图节点</dt><dd>2<small>个</small></dd></div>
  <div><dt>最大循环</dt><dd>10<small>次</small></dd></div>
  <div><dt>SSE 事件</dt><dd>6<small>种</small></dd></div>
  <div><dt>测试模型</dt><dd>3b</dd></div>
</dl>

## 做了什么

[ex-langgraph](https://github.com/iinow/ex-langgraph) 是用 [Eino](https://github.com/cloudwego/eino) 做的智能体示例。把问题发给 Gin 服务器，答案以 SSE 流式返回，对话和工具调用记录写进 MySQL，可以在网页里查看。模型只要兼容 OpenAI 地址就能接，默认是本地 Ollama 的 `qwen2.5:3b`。

<ol class="loop" aria-label="智能体循环顺序">
  <li>提问</li>
  <li>model</li>
  <li class="hot">调用工具?</li>
  <li class="hot">tools</li>
  <li>model</li>
  <li>回答</li>
</ol>

节点只有 `model` 和 `tools` 两个。模型回复里带工具调用就去 `tools`，不带就结束。为了防止模型一直调用工具，节点执行到 10 次就掐断。

## 卡住我的一点：节点只拿得到上一个节点的输出

图里节点之间只传递紧挨着的前一个节点的输出。`tools` 节点只交回工具结果，照这样放着，模型就看不到原来的问题。所以我把整段对话堆在图 state 里，进入 `model` 节点之前整体替换进去。

```go
compose.WithStatePreHandler(func(ctx context.Context, in []*schema.Message, s *state) ([]*schema.Message, error) {
    s.history = append(s.history, in...) // 把进来的内容(问题或工具结果)堆起来
    return s.history, nil                // 给模型的是整段对话
})
```

state 只活一次执行。要长期留存的记录，在每条消息产生时用钩子直接写进 DB。中途失败，之前发生的对话也还在。

## 答案流出来的样子

在 Eino 回调里接住 token 和工具调用，原样做成 SSE 事件发出去。

| 事件 | 含义 |
|---|---|
| `session` | 会话确定 (新对话就是新编号) |
| `tool_call` | 工具调用开始，名字和参数 |
| `tool_result` | 工具执行结果 |
| `delta` | 回答 token 的片段 |
| `done` | 结束，完整回答 |
| `error` | 执行中失败 |

浏览器断开连接，context 就会被取消，执行也随之停下。

## 一个大工具里面装一个小工作流

像「给金民俊推荐一辆车」这样的活儿，要查用户、取车辆列表、挑选、保存，好几步。对对话智能体只给一个叫 `recommend_vehicle` 的大工具，在里面跑三步。

| 步骤 | 做什么 | 谁决定 |
|---|---|---|
| 查询 | 小智能体用只读工具取出用户和候选 | 模型 |
| 结论 | 把查到的对话交给它，用 JSON 回答。可选的 id 用 schema 的 enum 卡住 | 格式由代码定 |
| 校验·保存 | 看 id 在不在候选里、有没有理由、必做的查询做没做。不对就重来，还不对就用第一个候选 | 代码 |

关键是不把数据塞进提示词，让模型自己用工具去取。

## 交给 3b 模型之后

同一件事用两种方式对 3 个用户各跑了一遍。

| | 数据放进提示词 | 用工具查询 |
|---|---|---|
| 挑头像 | 3 人都合适 | 3 人都合适 |
| 推荐车辆 | 3 人都合适 | 经常跳过车辆列表查询就直接选 |
| 耗时 | 2~4 秒 | 9~20 秒 |

用工具查询能很好地体现「模型自己去拿需要的东西」，但小模型会漏掉查询，而且慢。所以用代码兜住。

| 3b 实际犯的错 | 兜住的办法 |
|---|---|
| 不能按顺序使用多个工具 | 一个大工具 + 内部工作流 |
| 编造 id (`u-金民俊`) | 也按名字查，去掉前面的 `u-` 再查一次 |
| 用不存在的 id 调工具 | 连同错误一起返回候选列表 |
| 选了候选外的 id 或漏掉理由 | JSON schema 的 enum 和 required |
| 跳过必须做的查询 | 缺了就让它重来 |
| 发空回复导致下一次调用 400 | 重发时去掉空消息 |
| 给女性用户显示男性照片 | 性别过滤不交给模型，由代码做 |

学到的东西很简单。模型擅长的是挑选和说话，格式、校验、过滤必须握在代码手里，小模型才能跑起来。

## 用到的

- Go 1.25
- Eino
- Gin
- SSE
- MySQL 8
- sqlc
- Ollama
{: .stack}

这个示例后来成了 [lite-oc](/zh/posts/lite-oc/) 的起点。代码在 [github.com/iinow/ex-langgraph](https://github.com/iinow/ex-langgraph)。
