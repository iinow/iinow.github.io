// TSID 생성기 (/online/tsid/, /en/online/tsid/)
// 64비트 = 42비트 시각(2020-01-01 UTC부터 ms) + 22비트(노드 + 카운터)
;(function () {
  'use strict'

  const EN = (document.documentElement.getAttribute('lang') || '').toLowerCase().startsWith('en')
  const T = EN
    ? {
        copy: 'Copy',
        copied: 'Copied ✓',
        badNumber: 'Enter a whole number.',
        nodeRange: (n) => 'Node ID must be between 0 and ' + n + '.',
        badTsid: 'Not a TSID. Enter a decimal integer or 13 Base32 characters.',
        tooBig: 'That value does not fit in 64 bits.',
        negativeOk: 'Read as a signed Int64; converted to UInt64 first.',
        generated: 'Generated.',
        count: (n) => n + ' generated',
      }
    : {
        copy: '복사',
        copied: '복사됨 ✓',
        badNumber: '정수만 넣을 수 있습니다.',
        nodeRange: (n) => '노드 ID는 0 – ' + n + ' 사이여야 합니다.',
        badTsid: 'TSID가 아닙니다. 10진수 정수나 Base32 13글자를 넣어 주세요.',
        tooBig: '64비트에 담기지 않는 값입니다.',
        negativeOk: 'Int64 음수로 읽어 UInt64로 되돌렸습니다.',
        generated: '생성했습니다.',
        count: (n) => n + '개 생성',
      }

  const EPOCH = 1577836800000 // 2020-01-01T00:00:00.000Z
  const TOTAL_RANDOM_BITS = 22
  const U64 = 1n << 64n
  const I64_MAX = (1n << 63n) - 1n
  const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

  const $ = (id) => document.getElementById(id)
  const nodeBitsEl = $('tsid-node-bits')
  const nodeEl = $('tsid-node')
  const genMsg = $('tsid-gen-msg')
  const nodeHint = $('tsid-node-hint')

  const toBase32 = (value) => {
    let v = value
    let out = ''
    for (let i = 0; i < 13; i++) {
      out = B32[Number(v & 31n)] + out
      v >>= 5n
    }
    return out
  }

  const fromBase32 = (text) => {
    let v = 0n
    for (const raw of text.toUpperCase()) {
      let idx = B32.indexOf(raw)
      if (idx === -1) {
        if (raw === 'I' || raw === 'L') idx = 1
        else if (raw === 'O') idx = 0
        else return null
      }
      v = (v << 5n) | BigInt(idx)
      if (v >= U64) return null
    }
    return v
  }

  // 같은 밀리초 안에서는 카운터를 올려 순서를 지키고, 넘치면 다음 밀리초로 넘어간다
  let lastTs = -1n
  let counter = 0n

  const nodeBits = () => {
    const n = parseInt(nodeBitsEl.value, 10)
    return Number.isFinite(n) ? Math.min(20, Math.max(0, n)) : 10
  }
  const counterBits = () => TOTAL_RANDOM_BITS - nodeBits()
  const nodeMask = () => (1n << BigInt(nodeBits())) - 1n
  const maxCounter = () => (1n << BigInt(counterBits())) - 1n

  const nextTsid = (node) => {
    let ts = BigInt(Date.now()) - BigInt(EPOCH)
    if (ts < 0n) ts = 0n
    if (ts > lastTs) {
      counter = 0n
    } else {
      // 같은 밀리초이거나 시계가 뒤로 갔다: 카운터를 올려도 순서가 유지된다
      ts = lastTs
      counter += 1n
      if (counter > maxCounter()) {
        ts += 1n
        counter = 0n
      }
    }
    lastTs = ts
    const id = (ts << 22n) | ((node & nodeMask()) << BigInt(counterBits())) | counter
    return id
  }

  const isoOf = (ts) => new Date(Number(ts) + EPOCH).toISOString()
  const int64Of = (id) => (id > I64_MAX ? id - U64 : id)

  const partsOf = (id) => {
    const ts = id >> 22n
    const node = (id >> BigInt(counterBits())) & nodeMask()
    const count = id & maxCounter()
    return { ts, node, count, iso: isoOf(ts), unix: Number(ts) + EPOCH }
  }

  const setResult = (kind, data) => {
    const root = document.querySelector('[data-result="' + kind + '"]')
    if (!root) return
    const put = (field, text) => {
      const el = root.querySelector('[data-field="' + field + '"]')
      if (el) el.textContent = text
    }
    put('uint', data.id.toString())
    if (data.id !== undefined) put('int', int64Of(data.id).toString())
    put('base32', toBase32(data.id))
    put('iso', data.iso)
    if (root.querySelector('[data-field="parts"]')) {
      put('parts', (EN ? 'node ' : '노드 ') + data.node.toString() + ' / ' + (EN ? 'counter ' : '카운터 ') + data.count.toString())
    }
    if (root.querySelector('[data-field="ts"]')) {
      put('ts', (EN ? 'TSID time ms ' : 'TSID 시각 ms ') + data.ts.toString() + ' · Unix ms ' + data.unix)
    }
  }

  // ── 복사 ──
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (e) {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.setAttribute('readonly', '')
        ta.style.position = 'fixed'
        ta.style.top = '-1000px'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        ta.remove()
        return ok
      } catch (err) {
        return false
      }
    }
  }

  document.querySelectorAll('[data-copy-field]').forEach((btn) => {
    const label = btn.textContent
    btn.addEventListener('click', async () => {
      const root = btn.closest('[data-result]')
      const field = root && root.querySelector('[data-field="' + btn.dataset.copyField + '"]')
      const text = field ? field.textContent.trim() : ''
      if (!text || text === '-') return
      const ok = await copy(text)
      btn.textContent = ok ? T.copied : label
      btn.classList.toggle('done', ok)
      setTimeout(() => {
        btn.textContent = label
        btn.classList.remove('done')
      }, 1400)
    })
  })

  // ── 비트 막대 ──
  const drawBits = () => {
    const nb = nodeBits()
    const cb = counterBits()
    const bar = document.querySelector('.bits')
    if (!bar) return
    const time = bar.querySelector('[data-bit="time"]')
    const node = bar.querySelector('[data-bit="node"]')
    const count = bar.querySelector('[data-bit="counter"]')
    time.style.flex = '42 0 0'
    time.textContent = (EN ? 'time 42' : '시각 42')
    node.style.flex = nb + ' 0 0'
    node.textContent = (EN ? 'node ' : '노드 ') + nb
    node.hidden = nb === 0
    count.style.flex = cb + ' 0 0'
    count.textContent = (EN ? 'counter ' : '카운터 ') + cb
  }

  const syncNodeField = () => {
    const max = Number(nodeMask())
    nodeEl.max = String(max)
    if (Number(nodeEl.value) > max) nodeEl.value = String(max)
    if (Number(nodeEl.value) < 0 || nodeEl.value === '') nodeEl.value = '0'
    nodeHint.textContent = '0 – ' + max
    drawBits()
  }

  const readNode = () => {
    const max = Number(nodeMask())
    let v = Number(nodeEl.value)
    if (!Number.isFinite(v) || Math.floor(v) !== v) {
      genMsg.textContent = T.badNumber
      genMsg.className = 'tool-msg bad'
      return null
    }
    if (v < 0 || v > max) {
      genMsg.textContent = T.nodeRange(max)
      genMsg.className = 'tool-msg bad'
      return null
    }
    genMsg.textContent = ''
    genMsg.className = 'tool-msg'
    return BigInt(v)
  }

  const generate = () => {
    const node = readNode()
    if (node === null) return null
    const id = nextTsid(node)
    const parts = partsOf(id)
    setResult('gen', { id, ts: parts.ts, node: parts.node, count: parts.count, iso: parts.iso, unix: parts.unix })
    return id
  }

  $('btn-generate').addEventListener('click', () => {
    const id = generate()
    if (id !== null) {
      genMsg.textContent = T.generated
      genMsg.className = 'tool-msg good'
    }
  })
  nodeBitsEl.addEventListener('change', syncNodeField)
  nodeEl.addEventListener('input', () => {
    nodeHint.textContent = '0 – ' + Number(nodeMask())
  })

  // ── 디코딩 ──
  const decodeMsg = $('decode-msg')
  const decodeInput = $('decode-input')

  const decode = () => {
    let raw = decodeInput.value.trim().replace(/[\s-]/g, '')
    decodeMsg.textContent = ''
    decodeMsg.className = 'tool-msg'
    if (!raw) {
      decodeMsg.textContent = T.badTsid
      decodeMsg.className = 'tool-msg bad'
      return null
    }
    let id = null
    let note = ''
    if (/^-?\d+$/.test(raw)) {
      let v = BigInt(raw)
      if (v < 0n) {
        if (v < -I64_MAX - 1n) {
          decodeMsg.textContent = T.tooBig
          decodeMsg.className = 'tool-msg bad'
          return null
        }
        v = U64 + v
        note = T.negativeOk
      }
      if (v >= U64) {
        decodeMsg.textContent = T.tooBig
        decodeMsg.className = 'tool-msg bad'
        return null
      }
      id = v
    } else if (/^[0-9A-Za-z]{13}$/.test(raw)) {
      id = fromBase32(raw)
    }
    if (id === null) {
      decodeMsg.textContent = T.badTsid
      decodeMsg.className = 'tool-msg bad'
      return null
    }
    const parts = partsOf(id)
    setResult('dec', { id, ts: parts.ts, node: parts.node, count: parts.count, iso: parts.iso, unix: parts.unix })
    if (note) {
      decodeMsg.textContent = note
      decodeMsg.className = 'tool-msg good'
    }
    return id
  }

  $('btn-decode').addEventListener('click', decode)
  decodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      decode()
    }
  })
  $('btn-decode-gen').addEventListener('click', () => {
    const out = document.querySelector('[data-result="gen"] [data-field="uint"]')
    if (!out || out.textContent === '-') generate()
    const value = document.querySelector('[data-result="gen"] [data-field="uint"]').textContent
    if (value && value !== '-') {
      decodeInput.value = value
      decode()
    }
  })

  // ── 대량 생성 ──
  const bulkList = $('bulk-list')
  const bulkLabel = $('bulk-count-label')
  const bulkFormat = $('bulk-format')
  let bulkValues = []

  const formatOf = (id) => {
    if (bulkFormat.value === 'uint') return id.toString()
    if (bulkFormat.value === 'int') return int64Of(id).toString()
    return toBase32(id)
  }

  const runBulk = () => {
    const node = readNode()
    if (node === null) return
    const want = Math.min(1000, Math.max(1, parseInt($('bulk-count').value, 10) || 1))
    bulkValues = []
    const rows = []
    const frag = document.createDocumentFragment()
    const ol = document.createElement('ol')
    for (let i = 0; i < want; i++) {
      const id = nextTsid(node)
      const parts = partsOf(id)
      const value = formatOf(id)
      bulkValues.push(value)
      const li = document.createElement('li')
      const v = document.createElement('span')
      v.className = 'v'
      v.textContent = value
      const c = document.createElement('span')
      c.className = 'c'
      c.textContent = parts.iso.slice(11, 23)
      li.append(v, c)
      ol.appendChild(li)
      rows.push(value)
    }
    frag.appendChild(ol)
    bulkList.textContent = ''
    bulkList.appendChild(frag)
    bulkLabel.textContent = T.count(rows.length)
  }

  $('btn-bulk').addEventListener('click', runBulk)
  $('btn-bulk-copy').addEventListener('click', async (e) => {
    if (!bulkValues.length) return
    const btn = e.currentTarget
    const ok = await copy(bulkValues.join('\n'))
    const label = btn.textContent
    btn.textContent = ok ? T.copied : label
    btn.classList.toggle('done', ok)
    setTimeout(() => {
      btn.textContent = label
      btn.classList.remove('done')
    }, 1400)
  })

  // ── 시작 ──
  syncNodeField()
  generate()
  genMsg.textContent = ''
})()
