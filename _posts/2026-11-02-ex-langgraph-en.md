---
layout: post
title: Building a LangGraph-style agent in Go, then handing it to a small model
summary: The model calls a tool, we run it, we hand the result back, and ask again. I wrote that loop myself in Go with Eino. Then I gave it to a 3b model running on a laptop, and wrote down where it falls over and how I propped it up in code.
image: /img/og/ex-langgraph-en.png
image_alt: Building a LangGraph-style agent in Go, then handing it to a small model
category: Dev
lang: en
ref: ex-langgraph
permalink: /en/posts/ex-langgraph/
---

<dl class="facts">
  <div><dt>Graph nodes</dt><dd>2</dd></div>
  <div><dt>Max steps</dt><dd>10</dd></div>
  <div><dt>SSE events</dt><dd>6</dd></div>
  <div><dt>Test model</dt><dd>3b</dd></div>
</dl>

## What I built

[ex-langgraph](https://github.com/iinow/ex-langgraph) is an example agent built with [Eino](https://github.com/cloudwego/eino). Send a question to the Gin server and the answer streams back over SSE; conversations and tool calls are kept in MySQL and you can read them in the web UI. Any OpenAI-compatible endpoint works as the model, and the default is `qwen2.5:3b` on a local Ollama.

<ol class="loop" aria-label="Agent loop">
  <li>Question</li>
  <li>model</li>
  <li class="hot">tool call?</li>
  <li class="hot">tools</li>
  <li>model</li>
  <li>Answer</li>
</ol>

There are only two nodes, `model` and `tools`. If the model's response contains a tool call we go to `tools`; if not, we stop. To keep the model from calling tools forever, node execution is cut off at ten steps.

## One thing that confused me: a node only gets the previous output

In a graph, nodes pass along only the output of the node immediately before them. The `tools` node hands over nothing but tool results, so left alone the model never sees the original question. So I keep the whole conversation in the graph state and swap it in wholesale just before entering the `model` node.

```go
compose.WithStatePreHandler(func(ctx context.Context, in []*schema.Message, s *state) ([]*schema.Message, error) {
    s.history = append(s.history, in...) // stack what came in (the question or a tool result)
    return s.history, nil                // hand the model the whole conversation
})
```

The state only lives for one run. Anything worth keeping is written straight to the DB through a hook each time a message is created, so even if the run fails halfway, the conversation up to that point survives.

## How the answer streams out

The Eino callback receives tokens and tool calls and emits them as SSE events exactly as they come.

| Event | Meaning |
|---|---|
| `session` | Session fixed (a new conversation gets a new number) |
| `tool_call` | Tool call starts, with name and arguments |
| `tool_result` | Result of running the tool |
| `delta` | A piece of the answer |
| `done` | End, with the full answer |
| `error` | Something failed during the run |

If the browser drops the connection, the context is cancelled and the run stops too.

## A small workflow inside one big tool

Something like "recommend a car for Kim Minjun" is several steps: look up the user, fetch the vehicle list, choose, and save. The chat agent gets one big tool, `recommend_vehicle`, and the three steps run inside it.

| Step | What it does | Who decides |
|---|---|---|
| Lookup | A small agent pulls the user and candidates with read-only tools | Model |
| Decision | Hand it the conversation and ask for JSON. The ids it may pick are pinned in the schema as an enum | Format: code |
| Validate and save | Check the id is among the candidates, that a reason is given, that the required lookups happened. If wrong, try again; still wrong, take the first candidate | Code |

The point was not to stuff data into the prompt but to let the model fetch it with tools itself.

## Handing it to a 3b model

I ran the same job two ways, for three users.

| | Data in the prompt | Fetched with tools |
|---|---|---|
| Picking a profile photo | All three appropriate | All three appropriate |
| Vehicle recommendation | All three appropriate | Often skipped the vehicle lookup and just picked |
| Time taken | 2–4 s | 9–20 s |

Tool lookup is a good way to show the model fetching what it needs by itself, but a small model skips lookups and is slow. So I propped it up in code.

| What the 3b model actually did | How I propped it up |
|---|---|
| Can't chain several tools in order | One big tool with a workflow inside |
| Makes up ids (`u-KimMinjun`) | Look up by name as well; strip the `u-` and try again |
| Calls a tool with an id that doesn't exist | Return the candidate list along with the error |
| Picks an id outside the candidates, or leaves out the reason | enum and required in the JSON schema |
| Skips a lookup it has to do | Ask again when it's missing |
| Sends an empty response, so the next call gets a 400 | Drop empty messages when retrying |
| Shows a male photo to a female user | Gender filtering stays in code, not with the model |

The lesson is simple. The model is good at choosing and talking; format, validation and filtering have to stay in code for a small model to work at all.

## Stack

- Go 1.25
- Eino
- Gin
- SSE
- MySQL 8
- sqlc
- Ollama
{: .stack}

This example later became the starting point for [lite-oc](/en/posts/lite-oc/). The code is at [github.com/iinow/ex-langgraph](https://github.com/iinow/ex-langgraph).
