// OpenAPI 변경 감지 (/online/openapi-diff/, /en/…, /ja/…, /zh/…)
// 두 OpenAPI 3.x 문서를 브라우저에서 비교해 Breaking / 안전한 변경을 가른다.
;(function () {
  'use strict'

  const LANG = (() => {
    const l = (document.documentElement.getAttribute('lang') || 'ko').toLowerCase()
    if (l.startsWith('zh')) return 'zh'
    if (l.startsWith('ja')) return 'ja'
    if (l.startsWith('en')) return 'en'
    return 'ko'
  })()
  const L = {
    ko: {
      emptySpec: '스펙이 비어 있습니다.',
      parseError: (m) => '스펙을 읽지 못했습니다: ' + m,
      notSpec: 'OpenAPI 문서가 아닙니다. openapi·paths 항목을 확인해 주세요.',
      noYaml: 'YAML 파서를 불러오지 못했습니다. JSON으로 넣어 주세요.',
      sameSpec: '두 스펙에서 계약 변경을 찾지 못했습니다.',
      read: (n, t, v) => t + ' ' + v + ' · 엔드포인트 ' + n + '개',
      done: (b, s) => 'Breaking ' + b + '건 · 안전한 변경 ' + s + '건',
      loaded: '불러왔습니다.',
      breaking: 'Breaking',
      safe: '안전',
      all: '전체',
      added: '추가',
      removed: '삭제',
      sumBreaking: 'Breaking',
      sumSafe: '안전한 변경',
      sumAdded: '추가된 엔드포인트',
      sumRemoved: '삭제된 엔드포인트',
      endpointRemoved: '엔드포인트가 사라졌습니다.',
      endpointAdded: '새 엔드포인트입니다.',
      paramAdded: (p) => '파라미터 추가: ' + p.in + ' ' + p.name + (p.required ? ' (필수)' : ' (선택)'),
      paramRemoved: (p) => '파라미터 삭제: ' + p.in + ' ' + p.name + (p.required ? ' (필수)' : ' (선택)'),
      paramRequired: (p) => '필수로 바뀐 파라미터: ' + p.name,
      paramOptional: (p) => '선택으로 바뀐 파라미터: ' + p.name,
      paramLabel: (p) => '파라미터 ' + p.name,
      requestBody: '요청 본문',
      requestBodyRemoved: '요청 본문이 사라졌습니다.',
      requestBodyAddedRequired: '필수 요청 본문이 생겼습니다.',
      requestBodyAddedOptional: '선택 요청 본문이 생겼습니다.',
      requestBodyRequired: '요청 본문이 필수로 바뀌었습니다.',
      responseRemoved: (c) => '응답 ' + c + ' 삭제',
      responseAdded: (c) => '응답 ' + c + ' 추가',
      responseLabel: (c) => '응답 ' + c,
      deprecated: 'deprecated 로 표시되었습니다.',
      schemaAdded: (l) => l + ' 스키마 추가',
      schemaRemoved: (l) => l + ' 스키마 삭제',
      typeChanged: (l, a, b) => l + ' 타입 변경: ' + a + ' → ' + b,
      formatChanged: (l, a, b) => l + ' format 변경: ' + a + ' → ' + b,
      enumRemoved: (l, v) => l + ' enum에서 "' + v + '" 삭제',
      enumAdded: (l, v) => l + ' enum에 "' + v + '" 추가',
      enumDropped: (l) => l + ' enum 사라짐',
      enumIntroduced: (l) => l + ' enum 생김',
      requiredFieldAdded: (l, n) => l + '.' + n + ' 필수 필드 추가',
      optionalFieldAdded: (l, n) => l + '.' + n + ' 선택 필드 추가',
      responseFieldAdded: (l, n) => l + '.' + n + ' 응답 필드 추가',
      requestFieldRemoved: (l, n) => l + '.' + n + ' 요청 필드 삭제',
      responseFieldRemoved: (l, n) => l + '.' + n + ' 응답 필드 삭제',
      fieldBecameRequired: (l, n) => l + '.' + n + ' 이 필수로 바뀜',
      fieldBecameOptional: (l, n) => l + '.' + n + ' 이 선택으로 바뀜',
      noChangesForFilter: '이 종류의 변경은 없습니다.',
      before: 'Before',
      after: 'After',
    },
    en: {
      emptySpec: 'A spec is empty.',
      parseError: (m) => 'Could not read the spec: ' + m,
      notSpec: 'That is not an OpenAPI document. Check the openapi and paths entries.',
      noYaml: 'The YAML parser did not load. Paste JSON instead.',
      sameSpec: 'No contract changes found between the two specs.',
      read: (n, t, v) => t + ' ' + v + ' · ' + n + ' endpoints',
      done: (b, s) => b + ' breaking, ' + s + ' safe',
      loaded: 'Loaded.',
      breaking: 'Breaking',
      safe: 'Safe',
      all: 'All',
      added: 'Added',
      removed: 'Removed',
      sumBreaking: 'Breaking',
      sumSafe: 'Safe changes',
      sumAdded: 'Endpoints added',
      sumRemoved: 'Endpoints removed',
      endpointRemoved: 'The endpoint was removed.',
      endpointAdded: 'New endpoint.',
      paramAdded: (p) => 'Parameter added: ' + p.in + ' ' + p.name + (p.required ? ' (required)' : ' (optional)'),
      paramRemoved: (p) => 'Parameter removed: ' + p.in + ' ' + p.name + (p.required ? ' (required)' : ' (optional)'),
      paramRequired: (p) => 'Parameter is now required: ' + p.name,
      paramOptional: (p) => 'Parameter is now optional: ' + p.name,
      paramLabel: (p) => 'parameter ' + p.name,
      requestBody: 'request body',
      requestBodyRemoved: 'Request body removed.',
      requestBodyAddedRequired: 'A required request body was added.',
      requestBodyAddedOptional: 'An optional request body was added.',
      requestBodyRequired: 'The request body is now required.',
      responseRemoved: (c) => 'Response ' + c + ' removed.',
      responseAdded: (c) => 'Response ' + c + ' added.',
      responseLabel: (c) => 'response ' + c,
      deprecated: 'The operation is marked deprecated.',
      schemaAdded: (l) => 'Schema added: ' + l,
      schemaRemoved: (l) => 'Schema removed: ' + l,
      typeChanged: (l, a, b) => l + ' type: ' + a + ' → ' + b,
      formatChanged: (l, a, b) => l + ' format: ' + a + ' → ' + b,
      enumRemoved: (l, v) => l + ' enum: removed "' + v + '"',
      enumAdded: (l, v) => l + ' enum: added "' + v + '"',
      enumDropped: (l) => l + ' enum removed',
      enumIntroduced: (l) => l + ' enum introduced',
      requiredFieldAdded: (l, n) => l + '.' + n + ' is now a required field',
      optionalFieldAdded: (l, n) => l + '.' + n + ' added (optional)',
      responseFieldAdded: (l, n) => l + '.' + n + ' added to the response',
      requestFieldRemoved: (l, n) => l + '.' + n + ' removed from the request',
      responseFieldRemoved: (l, n) => l + '.' + n + ' removed from the response',
      fieldBecameRequired: (l, n) => l + '.' + n + ' became required',
      fieldBecameOptional: (l, n) => l + '.' + n + ' became optional',
      noChangesForFilter: 'Nothing matches this filter.',
      before: 'Before',
      after: 'After',
    },
    ja: {
      emptySpec: 'スペックが空です。',
      parseError: (m) => 'スペックを読み込めませんでした: ' + m,
      notSpec: 'OpenAPI ドキュメントではありません。openapi・paths の項目を確認してください。',
      noYaml: 'YAML パーサーを読み込めませんでした。JSON で入れてください。',
      sameSpec: '2 つのスペックに契約の変更はありませんでした。',
      read: (n, t, v) => t + ' ' + v + ' · エンドポイント ' + n + ' 件',
      done: (b, s) => 'Breaking ' + b + ' 件 · 安全な変更 ' + s + ' 件',
      loaded: '読み込みました。',
      breaking: 'Breaking',
      safe: '安全',
      all: 'すべて',
      added: '追加',
      removed: '削除',
      sumBreaking: 'Breaking',
      sumSafe: '安全な変更',
      sumAdded: '追加されたエンドポイント',
      sumRemoved: '削除されたエンドポイント',
      endpointRemoved: 'エンドポイントがなくなりました。',
      endpointAdded: '新しいエンドポイントです。',
      paramAdded: (p) => 'パラメーター追加: ' + p.in + ' ' + p.name + (p.required ? ' (必須)' : ' (任意)'),
      paramRemoved: (p) => 'パラメーター削除: ' + p.in + ' ' + p.name + (p.required ? ' (必須)' : ' (任意)'),
      paramRequired: (p) => '必須に変わったパラメーター: ' + p.name,
      paramOptional: (p) => '任意に変わったパラメーター: ' + p.name,
      paramLabel: (p) => 'パラメーター ' + p.name,
      requestBody: 'リクエストボディ',
      requestBodyRemoved: 'リクエストボディがなくなりました。',
      requestBodyAddedRequired: '必須のリクエストボディが追加されました。',
      requestBodyAddedOptional: '任意のリクエストボディが追加されました。',
      requestBodyRequired: 'リクエストボディが必須に変わりました。',
      responseRemoved: (c) => 'レスポンス ' + c + ' を削除',
      responseAdded: (c) => 'レスポンス ' + c + ' を追加',
      responseLabel: (c) => 'レスポンス ' + c,
      deprecated: 'deprecated が付きました。',
      schemaAdded: (l) => l + ' スキーマを追加',
      schemaRemoved: (l) => l + ' スキーマを削除',
      typeChanged: (l, a, b) => l + ' の型変更: ' + a + ' → ' + b,
      formatChanged: (l, a, b) => l + ' の format 変更: ' + a + ' → ' + b,
      enumRemoved: (l, v) => l + ' の enum から "' + v + '" を削除',
      enumAdded: (l, v) => l + ' の enum に "' + v + '" を追加',
      enumDropped: (l) => l + ' の enum がなくなりました',
      enumIntroduced: (l) => l + ' に enum が付きました',
      requiredFieldAdded: (l, n) => l + '.' + n + ' を必須フィールドとして追加',
      optionalFieldAdded: (l, n) => l + '.' + n + ' を任意フィールドとして追加',
      responseFieldAdded: (l, n) => l + '.' + n + ' をレスポンスに追加',
      requestFieldRemoved: (l, n) => l + '.' + n + ' をリクエストから削除',
      responseFieldRemoved: (l, n) => l + '.' + n + ' をレスポンスから削除',
      fieldBecameRequired: (l, n) => l + '.' + n + ' が必須に変わりました',
      fieldBecameOptional: (l, n) => l + '.' + n + ' が任意に変わりました',
      noChangesForFilter: 'この種類の変更はありません。',
      before: 'Before',
      after: 'After',
    },
    zh: {
      emptySpec: '规范内容为空。',
      parseError: (m) => '无法读取规范: ' + m,
      notSpec: '不是 OpenAPI 文档。请检查 openapi 和 paths 字段。',
      noYaml: 'YAML 解析器加载失败。请改用 JSON。',
      sameSpec: '两份规范之间没有契约变更。',
      read: (n, t, v) => t + ' ' + v + ' · 端点 ' + n + ' 个',
      done: (b, s) => 'Breaking ' + b + ' 项 · 安全变更 ' + s + ' 项',
      loaded: '已加载。',
      breaking: 'Breaking',
      safe: '安全',
      all: '全部',
      added: '新增',
      removed: '删除',
      sumBreaking: 'Breaking',
      sumSafe: '安全变更',
      sumAdded: '新增的端点',
      sumRemoved: '删除的端点',
      endpointRemoved: '端点已被删除。',
      endpointAdded: '新增的端点。',
      paramAdded: (p) => '新增参数: ' + p.in + ' ' + p.name + (p.required ? ' (必填)' : ' (可选)'),
      paramRemoved: (p) => '删除参数: ' + p.in + ' ' + p.name + (p.required ? ' (必填)' : ' (可选)'),
      paramRequired: (p) => '参数变为必填: ' + p.name,
      paramOptional: (p) => '参数变为可选: ' + p.name,
      paramLabel: (p) => '参数 ' + p.name,
      requestBody: '请求体',
      requestBodyRemoved: '请求体已被删除。',
      requestBodyAddedRequired: '新增了必填请求体。',
      requestBodyAddedOptional: '新增了可选请求体。',
      requestBodyRequired: '请求体变为必填。',
      responseRemoved: (c) => '删除响应 ' + c,
      responseAdded: (c) => '新增响应 ' + c,
      responseLabel: (c) => '响应 ' + c,
      deprecated: '该操作被标记为 deprecated。',
      schemaAdded: (l) => l + ' 新增结构',
      schemaRemoved: (l) => l + ' 删除结构',
      typeChanged: (l, a, b) => l + ' 类型变更: ' + a + ' → ' + b,
      formatChanged: (l, a, b) => l + ' format 变更: ' + a + ' → ' + b,
      enumRemoved: (l, v) => l + ' 的 enum 删除 "' + v + '"',
      enumAdded: (l, v) => l + ' 的 enum 增加 "' + v + '"',
      enumDropped: (l) => l + ' 的 enum 被删除',
      enumIntroduced: (l) => l + ' 新增 enum',
      requiredFieldAdded: (l, n) => l + '.' + n + ' 成为必填字段',
      optionalFieldAdded: (l, n) => l + '.' + n + ' 以可选字段新增',
      responseFieldAdded: (l, n) => l + '.' + n + ' 加入响应',
      requestFieldRemoved: (l, n) => l + '.' + n + ' 从请求中删除',
      responseFieldRemoved: (l, n) => l + '.' + n + ' 从响应中删除',
      fieldBecameRequired: (l, n) => l + '.' + n + ' 变为必填',
      fieldBecameOptional: (l, n) => l + '.' + n + ' 变为可选',
      noChangesForFilter: '没有这类变更。',
      before: 'Before',
      after: 'After',
    },
  }[LANG]

  const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
  const $ = (id) => document.getElementById(id)
  const beforeEl = $('spec-before')
  const afterEl = $('spec-after')
  const msg = $('diff-msg')
  const summaryEl = $('diff-summary')
  const filtersEl = $('diff-filters')
  const groupsEl = $('diff-groups')
  const metaBefore = $('meta-before')
  const metaAfter = $('meta-after')

  let state = { changes: [], endpoints: { added: 0, removed: 0 }, filter: 'all' }

  // ── 읽기 ──
  const parseSpec = (text) => {
    const raw = (text || '').trim()
    if (!raw) throw new Error(L.emptySpec)
    let doc
    try {
      doc = JSON.parse(raw)
    } catch (e) {
      if (!window.jsyaml) throw new Error(L.noYaml)
      try {
        doc = window.jsyaml.load(raw)
      } catch (err) {
        throw new Error(L.parseError(err.message || String(err)))
      }
    }
    if (!doc || typeof doc !== 'object' || !doc.paths || typeof doc.paths !== 'object') {
      throw new Error(L.notSpec)
    }
    return doc
  }

  const showMsg = (text, kind) => {
    msg.textContent = text || ''
    msg.className = 'tool-msg' + (kind ? ' ' + kind : '')
  }

  const metaOf = (spec) => {
    const title = (spec.info && spec.info.title) || '(untitled)'
    const version = (spec.info && spec.info.version) || '?'
    const n = Object.keys(spec.paths || {}).length
    return L.read(n, title, version)
  }

  // ── $ref 풀기 ──
  const resolveRef = (spec, node, seen) => {
    if (!node || typeof node !== 'object') return node
    if (typeof node.$ref !== 'string' || node.$ref.charAt(0) !== '#') return node
    const bag = seen || new Set()
    const key = node.$ref
    if (bag.has(key)) return {}
    bag.add(key)
    const bits = key.slice(2).split('/')
    let target = spec
    for (const bit of bits) {
      const k = bit.replace(/~1/g, '/').replace(/~0/g, '~')
      target = target && typeof target === 'object' ? target[k] : undefined
    }
    const out = resolveRef(spec, target, bag)
    bag.delete(key)
    return out
  }

  const flatten = (spec, schema) => {
    if (!schema || typeof schema !== 'object' || !Array.isArray(schema.allOf)) return schema
    const out = { type: schema.type || 'object', properties: {}, required: [] }
    const take = (part) => {
      const p = resolveRef(spec, part)
      if (!p || typeof p !== 'object') return
      Object.assign(out.properties, p.properties || {})
      for (const r of p.required || []) if (!out.required.includes(r)) out.required.push(r)
    }
    schema.allOf.forEach(take)
    Object.assign(out.properties, schema.properties || {})
    for (const r of schema.required || []) if (!out.required.includes(r)) out.required.push(r)
    return out
  }

  const typeOf = (s) => {
    if (!s || typeof s !== 'object') return 'none'
    if (Array.isArray(s.type)) return s.type.join('|')
    if (s.type) return s.type
    if (s.properties) return 'object'
    if (s.items) return 'array'
    if (s.oneOf || s.anyOf) return 'union'
    if (s.enum) return 'enum'
    return 'any'
  }

  const contentSchema = (spec, content) => {
    if (!content || typeof content !== 'object') return null
    const keys = Object.keys(content)
    if (!keys.length) return null
    const pick = keys.find((k) => /json/i.test(k)) || keys[0]
    return resolveRef(spec, (content[pick] || {}).schema)
  }

  const paramMap = (spec, op, item) => {
    const map = new Map()
    const take = (list) => {
      ;(list || []).forEach((raw) => {
        const p = resolveRef(spec, raw)
        if (p && p.name) map.set((p.in || 'query') + ':' + p.name, p)
      })
    }
    take(item.parameters)
    take(op.parameters)
    return map
  }

  const requestInfo = (spec, op) => {
    const rb = resolveRef(spec, op.requestBody)
    if (!rb || typeof rb !== 'object') return null
    return { required: !!rb.required, schema: contentSchema(spec, rb.content) }
  }

  const responseMap = (spec, op) => {
    const map = new Map()
    Object.keys(op.responses || {}).forEach((code) => {
      const res = resolveRef(spec, op.responses[code])
      map.set(String(code), res && res.content ? contentSchema(spec, res.content) : null)
    })
    return map
  }

  const operationsOf = (spec) => {
    const map = new Map()
    const paths = spec.paths || {}
    Object.keys(paths).forEach((path) => {
      const item = paths[path]
      if (!item || typeof item !== 'object') return
      METHODS.forEach((m) => {
        if (item[m] && typeof item[m] === 'object') {
          map.set(m.toUpperCase() + ' ' + path, { method: m.toUpperCase(), path, op: item[m], item })
        }
      })
    })
    return map
  }

  // ── 비교 ──
  const push = (ctx, key, group, severity, subtype, title, loc, before, after) => {
    ctx.changes.push({
      severity,
      subtype,
      group: key,
      method: group.method,
      path: group.path,
      title,
      loc,
      before,
      after,
    })
  }

  const compareSchema = (ctx, key, group, sa, sb, label, dir, loc, depth) => {
    if ((depth || 0) > 10) return
    const a = flatten(ctx.a, resolveRef(ctx.a, sa))
    const b = flatten(ctx.b, resolveRef(ctx.b, sb))
    if (!a && !b) return
    const mk = (severity, subtype, title, before, after) =>
      push(ctx, key, group, severity, subtype, title, loc, before, after)

    if (!a) {
      if (b) mk('nonbreaking', 'added', L.schemaAdded(label))
      return
    }
    if (!b) {
      mk('breaking', 'removed', L.schemaRemoved(label))
      return
    }
    const ta = typeOf(a)
    const tb = typeOf(b)
    if (ta !== tb) {
      mk('breaking', 'changed', L.typeChanged(label, ta, tb), ta, tb)
      return
    }
    if (a.format && b.format && a.format !== b.format) {
      mk('breaking', 'changed', L.formatChanged(label, a.format, b.format), a.format, b.format)
    }
    const ea = Array.isArray(a.enum) ? a.enum.map(String) : null
    const eb = Array.isArray(b.enum) ? b.enum.map(String) : null
    if (ea && eb) {
      ea.forEach((v) => {
        if (!eb.includes(v)) {
          mk(dir === 'request' ? 'breaking' : 'nonbreaking', 'changed', L.enumRemoved(label, v), v, '')
        }
      })
      eb.forEach((v) => {
        if (!ea.includes(v)) {
          mk(dir === 'request' ? 'nonbreaking' : 'breaking', 'changed', L.enumAdded(label, v), '', v)
        }
      })
    } else if (ea && !eb) {
      mk('nonbreaking', 'changed', L.enumDropped(label))
    } else if (!ea && eb) {
      mk(dir === 'request' ? 'nonbreaking' : 'breaking', 'changed', L.enumIntroduced(label))
    }

    const ap = a.properties || null
    const bp = b.properties || null
    if (ap || bp) {
      const reqA = new Set(a.required || [])
      const reqB = new Set(b.required || [])
      Object.keys(bp || {}).forEach((name) => {
        if (ap && name in ap) return
        if (dir === 'request') {
          if (reqB.has(name)) mk('breaking', 'added', L.requiredFieldAdded(label, name))
          else mk('nonbreaking', 'added', L.optionalFieldAdded(label, name))
        } else {
          mk('nonbreaking', 'added', L.responseFieldAdded(label, name))
        }
      })
      Object.keys(ap || {}).forEach((name) => {
        if (bp && name in bp) return
        if (dir === 'request') mk('nonbreaking', 'removed', L.requestFieldRemoved(label, name))
        else mk('breaking', 'removed', L.responseFieldRemoved(label, name))
      })
      Object.keys(ap || {}).forEach((name) => {
        if (!bp || !(name in bp)) return
        if (dir === 'request' && reqB.has(name) && !reqA.has(name)) {
          mk('breaking', 'changed', L.fieldBecameRequired(label, name))
        }
        if (dir === 'request' && !reqB.has(name) && reqA.has(name)) {
          mk('nonbreaking', 'changed', L.fieldBecameOptional(label, name))
        }
        compareSchema(ctx, key, group, ap[name], bp[name], label + '.' + name, dir, loc + '.properties.' + name, (depth || 0) + 1)
      })
      return
    }
    if (ta === 'array') {
      compareSchema(ctx, key, group, a.items, b.items, label + '[]', dir, loc + '.items', (depth || 0) + 1)
    }
  }

  const diffOperation = (ctx, key, a, b) => {
    const mk = (severity, subtype, title, loc, before, after) =>
      push(ctx, key, a, severity, subtype, title, loc, before, after)

    // 파라미터
    const pa = paramMap(ctx.a, a.op, a.item)
    const pb = paramMap(ctx.b, b.op, b.item)
    pb.forEach((p, k) => {
      if (pa.has(k)) return
      mk(p.required ? 'breaking' : 'nonbreaking', 'added', L.paramAdded(p), key + '.parameters[' + p.name + ']')
    })
    pa.forEach((p, k) => {
      if (pb.has(k)) return
      mk(p.required ? 'breaking' : 'nonbreaking', 'removed', L.paramRemoved(p), key + '.parameters[' + p.name + ']')
    })
    pa.forEach((p, k) => {
      const q = pb.get(k)
      if (!q) return
      if (!!p.required !== !!q.required) {
        mk(
          q.required ? 'breaking' : 'nonbreaking',
          'changed',
          q.required ? L.paramRequired(p) : L.paramOptional(p),
          key + '.parameters[' + p.name + '].required',
          String(!!p.required),
          String(!!q.required)
        )
      }
      compareSchema(ctx, key, a, p.schema, q.schema, L.paramLabel(p), 'request', key + '.parameters[' + p.name + '].schema', 0)
    })

    // 요청 본문
    const ra = requestInfo(ctx.a, a.op)
    const rb = requestInfo(ctx.b, b.op)
    if (ra && !rb) {
      mk('breaking', 'removed', L.requestBodyRemoved, key + '.requestBody')
    } else if (!ra && rb) {
      mk(rb.required ? 'breaking' : 'nonbreaking', 'added', rb.required ? L.requestBodyAddedRequired : L.requestBodyAddedOptional, key + '.requestBody')
      compareSchema(ctx, key, a, null, rb.schema, L.requestBody, 'request', key + '.requestBody', 0)
    } else if (ra && rb) {
      if (!ra.required && rb.required) mk('breaking', 'changed', L.requestBodyRequired, key + '.requestBody.required', 'false', 'true')
      compareSchema(ctx, key, a, ra.schema, rb.schema, L.requestBody, 'request', key + '.requestBody', 0)
    }

    // 응답
    const sa = responseMap(ctx.a, a.op)
    const sb = responseMap(ctx.b, b.op)
    sa.forEach((schema, code) => {
      if (!sb.has(code)) {
        mk('breaking', 'removed', L.responseRemoved(code), key + '.responses[' + code + ']')
        return
      }
      compareSchema(ctx, key, a, schema, sb.get(code), L.responseLabel(code), 'response', key + '.responses[' + code + ']', 0)
    })
    sb.forEach((schema, code) => {
      if (sa.has(code)) return
      mk('nonbreaking', 'added', L.responseAdded(code), key + '.responses[' + code + ']')
    })

    if (!a.op.deprecated && b.op.deprecated) {
      mk('nonbreaking', 'changed', L.deprecated, key + '.deprecated', 'false', 'true')
    }
  }

  const diffSpecs = (before, after) => {
    const ctx = { a: before, b: after, changes: [] }
    const endpoints = { added: 0, removed: 0 }
    const A = operationsOf(before)
    const B = operationsOf(after)
    A.forEach((a, key) => {
      if (B.has(key)) return
      endpoints.removed += 1
      push(ctx, key, a, 'breaking', 'removed', L.endpointRemoved, key)
    })
    B.forEach((b, key) => {
      if (A.has(key)) return
      endpoints.added += 1
      push(ctx, key, b, 'nonbreaking', 'added', L.endpointAdded, key)
    })
    A.forEach((a, key) => {
      const b = B.get(key)
      if (b) diffOperation(ctx, key, a, b)
    })
    return { changes: ctx.changes, endpoints }
  }

  // ── 그리기 ──
  const badgeOf = (severity) => {
    const span = document.createElement('span')
    span.className = 'badge ' + (severity === 'breaking' ? 'breaking' : 'nonbreaking')
    span.textContent = severity === 'breaking' ? L.breaking : L.safe
    return span
  }

  const renderSummary = () => {
    const breaking = state.changes.filter((c) => c.severity === 'breaking').length
    const safe = state.changes.length - breaking
    const cards = [
      { n: breaking, k: L.sumBreaking, cls: breaking ? 'breaking' : 'ok' },
      { n: safe, k: L.sumSafe, cls: 'ok' },
      { n: state.endpoints.added, k: L.sumAdded, cls: 'adding' },
      { n: state.endpoints.removed, k: L.sumRemoved, cls: 'breaking' },
    ]
    summaryEl.textContent = ''
    cards.forEach((c) => {
      const div = document.createElement('div')
      div.className = 'sum-card ' + c.cls
      const n = document.createElement('div')
      n.className = 'n'
      n.textContent = String(c.n)
      const k = document.createElement('div')
      k.className = 'k'
      k.textContent = c.k
      div.append(n, k)
      summaryEl.appendChild(div)
    })
  }

  const renderFilters = () => {
    const counts = {
      all: state.changes.length,
      breaking: state.changes.filter((c) => c.severity === 'breaking').length,
      nonbreaking: state.changes.filter((c) => c.severity === 'nonbreaking').length,
      added: state.changes.filter((c) => c.subtype === 'added').length,
      removed: state.changes.filter((c) => c.subtype === 'removed').length,
    }
    const labels = { all: L.all, breaking: L.breaking, nonbreaking: L.safe, added: L.added, removed: L.removed }
    filtersEl.textContent = ''
    Object.keys(labels).forEach((key) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.dataset.filter = key
      b.setAttribute('aria-pressed', String(state.filter === key))
      b.textContent = labels[key] + ' ' + counts[key]
      filtersEl.appendChild(b)
    })
  }

  const renderGroups = () => {
    const visible =
      state.filter === 'all'
        ? state.changes
        : state.changes.filter((c) =>
            state.filter === 'breaking' || state.filter === 'nonbreaking' ? c.severity === state.filter : c.subtype === state.filter
          )
    groupsEl.textContent = ''
    if (!visible.length) {
      const p = document.createElement('p')
      p.className = 'diff-empty'
      p.textContent = state.changes.length ? L.noChangesForFilter : L.sameSpec
      groupsEl.appendChild(p)
      return
    }
    const groups = new Map()
    visible.forEach((c) => {
      if (!groups.has(c.group)) groups.set(c.group, { method: c.method, path: c.path, changes: [] })
      groups.get(c.group).changes.push(c)
    })
    const ordered = [...groups.values()].sort((g1, g2) => {
      const rank = (g) => (g.changes.some((c) => c.severity === 'breaking' && c.subtype === 'removed' && c.loc === c.group) ? 0 : g.changes.some((c) => c.severity === 'breaking') ? 1 : g.changes.some((c) => c.subtype === 'added') ? 3 : 2)
      return rank(g1) - rank(g2) || g1.path.localeCompare(g2.path)
    })
    ordered.forEach((g) => {
      const root = document.createElement('section')
      root.className = 'diff-group'
      const breaking = g.changes.filter((c) => c.severity === 'breaking').length
      if (g.changes.length === 1 && g.changes[0].subtype === 'removed' && g.changes[0].loc === g.changes[0].group) root.classList.add('removed')
      if (g.changes.length === 1 && g.changes[0].subtype === 'added' && g.changes[0].loc === g.changes[0].group) root.classList.add('added')
      const head = document.createElement('header')
      const method = document.createElement('span')
      method.className = 'method'
      method.textContent = g.method
      const path = document.createElement('span')
      path.className = 'path'
      path.textContent = g.path
      head.append(method, path)
      if (breaking) head.appendChild(badgeOf('breaking'))
      const count = document.createElement('span')
      count.className = 'loc'
      count.textContent = '(' + g.changes.length + ')'
      head.appendChild(count)
      root.appendChild(head)

      const ul = document.createElement('ul')
      ul.className = 'diff-changes'
      g.changes.forEach((c) => {
        const li = document.createElement('li')
        const line = document.createElement('div')
        line.className = 'change-head'
        line.appendChild(badgeOf(c.severity))
        const text = document.createElement('span')
        text.textContent = c.title
        line.appendChild(text)
        li.appendChild(line)
        const loc = document.createElement('div')
        loc.className = 'loc'
        loc.textContent = c.loc
        li.appendChild(loc)
        if (c.before !== undefined || c.after !== undefined) {
          const ba = document.createElement('div')
          ba.className = 'before-after'
          const b1 = document.createElement('div')
          const lb = document.createElement('b')
          lb.textContent = L.before
          b1.append(lb, document.createTextNode(String(c.before ?? '-')))
          const b2 = document.createElement('div')
          const la = document.createElement('b')
          la.textContent = L.after
          b2.append(la, document.createTextNode(String(c.after ?? '-')))
          ba.append(b1, b2)
          li.appendChild(ba)
        }
        ul.appendChild(li)
      })
      root.appendChild(ul)
      groupsEl.appendChild(root)
    })
  }

  const render = () => {
    renderSummary()
    renderFilters()
    renderGroups()
  }

  // ── 실행 ──
  const run = () => {
    try {
      const before = parseSpec(beforeEl.value)
      const after = parseSpec(afterEl.value)
      metaBefore.textContent = metaOf(before)
      metaAfter.textContent = metaOf(after)
      const result = diffSpecs(before, after)
      state = { changes: result.changes, endpoints: result.endpoints, filter: 'all' }
      render()
      const b = state.changes.filter((c) => c.severity === 'breaking').length
      const s = state.changes.length - b
      showMsg(state.changes.length ? L.done(b, s) : L.sameSpec, state.changes.length ? (b ? 'bad' : 'good') : 'good')
    } catch (e) {
      state = { changes: [], endpoints: { added: 0, removed: 0 }, filter: 'all' }
      summaryEl.textContent = ''
      filtersEl.textContent = ''
      groupsEl.textContent = ''
      showMsg(e.message || String(e), 'bad')
    }
  }

  $('btn-diff').addEventListener('click', run)
  $('btn-swap').addEventListener('click', () => {
    const tmp = beforeEl.value
    beforeEl.value = afterEl.value
    afterEl.value = tmp
    const tm = metaBefore.textContent
    metaBefore.textContent = metaAfter.textContent
    metaAfter.textContent = tm
    if (beforeEl.value.trim() && afterEl.value.trim()) run()
  })
  $('btn-clear').addEventListener('click', () => {
    beforeEl.value = ''
    afterEl.value = ''
    metaBefore.textContent = ''
    metaAfter.textContent = ''
    state = { changes: [], endpoints: { added: 0, removed: 0 }, filter: 'all' }
    summaryEl.textContent = ''
    filtersEl.textContent = ''
    groupsEl.textContent = ''
    showMsg('')
    beforeEl.focus()
  })
  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]')
    if (!btn) return
    state.filter = btn.dataset.filter
    renderFilters()
    renderGroups()
  })

  // 파일 읽기
  const wireFile = (input, target) => {
    input.addEventListener('change', () => {
      const file = input.files && input.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        target.value = String(reader.result || '')
        input.value = ''
        if (beforeEl.value.trim() && afterEl.value.trim()) run()
        showMsg(L.loaded + ' ' + file.name, 'good')
      }
      reader.onerror = () => showMsg(L.parseError(String(reader.error || 'read error')), 'bad')
      reader.readAsText(file)
    })
  }
  wireFile($('file-before'), beforeEl)
  wireFile($('file-after'), afterEl)

  // ── 샘플 스펙 ──
  const SAMPLE_BEFORE = {
    openapi: '3.0.3',
    info: { title: 'Order API', version: '1.0.0' },
    paths: {
      '/orders': {
        get: {
          summary: '주문 목록',
          parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'paid'] } }],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } },
            },
            400: { description: 'Bad request' },
          },
        },
        post: {
          summary: '주문 생성',
          requestBody: { $ref: '#/components/requestBodies/OrderCreate' },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          },
        },
      },
      '/orders/{id}': {
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        get: {
          summary: '주문 하나',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
            404: { description: 'Not found' },
          },
        },
        delete: { summary: '주문 취소', responses: { 204: { description: 'No content' } } },
      },
      '/legacy/orders': {
        get: { summary: '옛 주문 목록', responses: { 200: { description: 'OK' } } },
      },
    },
    components: {
      requestBodies: {
        OrderCreate: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderCreate' } } },
        },
      },
      schemas: {
        Order: {
          type: 'object',
          required: ['id', 'status', 'total'],
          properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['open', 'paid'] },
            total: { type: 'number', format: 'double' },
            customer: { type: 'string' },
          },
        },
        OrderCreate: {
          type: 'object',
          required: ['customer'],
          properties: { customer: { type: 'string' }, note: { type: 'string' } },
        },
      },
    },
  }

  // 예시 스펙의 요약 문구는 화면 언어를 따른다
  const SAMPLE_TEXT = {
    ko: { list: '주문 목록', create: '주문 생성', one: '주문 하나', cancel: '주문 취소', legacy: '옛 주문 목록', refund: '환불 요청' },
    en: { list: 'Order list', create: 'Create an order', one: 'One order', cancel: 'Cancel an order', legacy: 'Legacy order list', refund: 'Request a refund' },
    ja: { list: '注文一覧', create: '注文の作成', one: '注文 1 件', cancel: '注文のキャンセル', legacy: '旧注文一覧', refund: '返金リクエスト' },
    zh: { list: '订单列表', create: '创建订单', one: '单个订单', cancel: '取消订单', legacy: '旧订单列表', refund: '申请退款' },
  }[LANG]
  SAMPLE_BEFORE.paths['/orders'].get.summary = SAMPLE_TEXT.list
  SAMPLE_BEFORE.paths['/orders'].post.summary = SAMPLE_TEXT.create
  SAMPLE_BEFORE.paths['/orders/{id}'].get.summary = SAMPLE_TEXT.one
  SAMPLE_BEFORE.paths['/orders/{id}'].delete.summary = SAMPLE_TEXT.cancel
  SAMPLE_BEFORE.paths['/legacy/orders'].get.summary = SAMPLE_TEXT.legacy

  const SAMPLE_AFTER = JSON.parse(JSON.stringify(SAMPLE_BEFORE))

  // 새 엔드포인트
  SAMPLE_AFTER.paths['/orders/{id}/refund'] = {
    post: {
      summary: SAMPLE_TEXT.refund,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: { reason: { type: 'string', enum: ['damaged', 'late', 'other'] } },
            },
          },
        },
      },
      responses: { 202: { description: 'Accepted' } },
    },
  }
  // 사라지는 엔드포인트
  delete SAMPLE_AFTER.paths['/legacy/orders']
  // 필수 파라미터 추가 + 선택 파라미터 추가
  SAMPLE_AFTER.paths['/orders'].get.parameters.push(
    { name: 'region', in: 'query', required: true, schema: { type: 'string' } },
    { name: 'limit', in: 'query', schema: { type: 'integer' } }
  )
  // 응답 코드 삭제
  delete SAMPLE_AFTER.paths['/orders/{id}'].get.responses['404']
  // deprecated 표시
  SAMPLE_AFTER.paths['/orders/{id}'].delete.deprecated = true
  // 공용 스키마 변경: total 타입, customer 삭제, createdAt 추가, status enum 추가
  const order = SAMPLE_AFTER.components.schemas.Order
  order.properties.total = { type: 'string' }
  delete order.properties.customer
  order.properties.createdAt = { type: 'string', format: 'date-time' }
  order.properties.status.enum.push('refunded')
  // 요청 스키마 변경: 필수 필드 추가 + 선택 필드 추가
  const create = SAMPLE_AFTER.components.schemas.OrderCreate
  create.required.push('currency')
  create.properties.currency = { type: 'string' }
  create.properties.coupon = { type: 'string' }

  document.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.sample
      const spec = which === 'before' ? SAMPLE_BEFORE : SAMPLE_AFTER
      const text = JSON.stringify(spec, null, 2)
      if (which === 'before') beforeEl.value = text
      else afterEl.value = text
      if (beforeEl.value.trim() && afterEl.value.trim()) run()
    })
  })

  // 처음에는 샘플로 채워 두고 한 번 비교해 둔다
  beforeEl.value = JSON.stringify(SAMPLE_BEFORE, null, 2)
  afterEl.value = JSON.stringify(SAMPLE_AFTER, null, 2)
  run()
})()
