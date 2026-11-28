// UUID v7 생성기 (/online/uuid-v7/ 와 /en·/ja·/zh 판)
// RFC 9562: 48비트 Unix ms + 버전 4비트(7) + rand_a 12비트 + 변형 2비트(10) + rand_b 62비트
// 문구는 #uuid7 의 data-* 에서 읽는다.
;(function () {
  'use strict'

  const root = document.getElementById('uuid7')
  if (!root) return
  const M = root.dataset
  const $ = (id) => document.getElementById(id)
  const locale = document.documentElement.getAttribute('lang') || 'ko'

  const MASK74 = (1n << 74n) - 1n
  const MASK62 = (1n << 62n) - 1n
  const MAX_TS = (1n << 48n) - 1n

  const rand74 = () => {
    const bytes = new Uint8Array(10)
    crypto.getRandomValues(bytes)
    let v = 0n
    for (const b of bytes) v = (v << 8n) | BigInt(b)
    return v & MASK74
  }

  // 같은 밀리초(또는 시계가 뒤로 간 경우)에는 난수 부분을 1 올려 순서를 지킨다
  const newState = () => ({ ts: -1n, rand: 0n })
  const next = (state, ms) => {
    let ts = BigInt(Math.floor(ms))
    if (ts < 0n) ts = 0n
    if (ts > MAX_TS) ts = MAX_TS
    if (ts > state.ts) {
      state.ts = ts
      state.rand = rand74()
    } else {
      state.rand += 1n
      if (state.rand > MASK74) {
        state.ts += 1n
        state.rand = rand74()
      }
    }
    return (state.ts << 80n) | (7n << 76n) | ((state.rand >> 62n) << 64n) | (2n << 62n) | (state.rand & MASK62)
  }

  const hyphenEl = $('uuid-hyphen')
  const upperEl = $('uuid-upper')
  const timeEl = $('uuid-time')

  const canonical = (v) => {
    const h = v.toString(16).padStart(32, '0')
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20)
  }
  const format = (v) => {
    let s = hyphenEl.checked ? canonical(v) : v.toString(16).padStart(32, '0')
    return upperEl.checked ? s.toUpperCase() : s
  }

  const parse = (text) => {
    const s = text.trim().replace(/^urn:uuid:/i, '').replace(/[{}\-\s]/g, '')
    return /^[0-9a-fA-F]{32}$/.test(s) ? BigInt('0x' + s) : null
  }

  const VARIANTS = ['NCS (0xxx)', 'NCS (0xxx)', 'NCS (0xxx)', 'NCS (0xxx)', 'RFC 9562 (10xx)', 'RFC 9562 (10xx)', 'Microsoft (110x)', 'reserved (111x)']
  const info = (v) => {
    const ts = v >> 80n
    return {
      version: Number((v >> 76n) & 15n),
      variant: VARIANTS[Number((v >> 61n) & 7n)],
      ms: Number(ts),
      randA: ((v >> 64n) & 0xfffn).toString(16).padStart(3, '0'),
      randB: (v & MASK62).toString(16).padStart(16, '0'),
    }
  }
  const isoOf = (ms) => new Date(ms).toISOString()

  // ── 하나 만들기 ──
  const liveState = newState()
  let current = null
  const genRoot = root.querySelector('[data-result="gen"]')

  // 시각을 지정하면 그 시각으로, 비우면 지금 시각으로 만든다
  const customMs = () => {
    if (!timeEl.value) return null
    const ms = new Date(timeEl.value).getTime()
    return Number.isFinite(ms) ? ms : null
  }

  const showCurrent = () => {
    if (current === null) return
    genRoot.querySelector('[data-field="uuid"]').textContent = format(current)
    const ms = info(current).ms
    genRoot.querySelector('[data-field="iso"]').textContent = isoOf(ms) + ' · Unix ms ' + ms
  }
  const generate = () => {
    const ms = customMs()
    current = ms === null ? next(liveState, Date.now()) : next(newState(), ms)
    showCurrent()
  }
  $('uuid-generate').addEventListener('click', generate)
  timeEl.addEventListener('change', generate)

  // ── 풀어 보기: 입력할 때마다 ──
  const inputEl = $('uuid-input')
  const msgEl = $('uuid-msg')
  const decRoot = root.querySelector('[data-result="dec"]')
  const put = (field, text) => {
    const el = decRoot.querySelector('[data-field="' + field + '"]')
    if (el) el.textContent = text
  }
  const say = (text) => {
    msgEl.textContent = text || ''
    msgEl.className = 'tool-msg' + (text ? ' bad' : '')
  }

  const decode = () => {
    const raw = inputEl.value
    for (const f of ['iso', 'local', 'unix', 'version', 'rand']) put(f, '-')
    if (!raw.trim()) {
      say('')
      return
    }
    const v = parse(raw)
    if (v === null) {
      say(M.errBad)
      return
    }
    const d = info(v)
    put('version', 'v' + d.version + ' / ' + d.variant)
    put('rand', d.randA + ' / ' + d.randB)
    if (d.version !== 7) {
      say((M.warnVersion || '').replace('{v}', String(d.version)))
    } else {
      say('')
      put('iso', isoOf(d.ms))
      put('local', new Date(d.ms).toLocaleString(locale))
      put('unix', String(d.ms))
    }
    remember(v, d)
  }
  inputEl.addEventListener('input', decode)
  $('uuid-use-last').addEventListener('click', () => {
    if (current === null) generate()
    inputEl.value = format(current)
    decode()
  })

  // ── 대량 생성 ──
  const bulkList = $('uuid-bulk-list')
  const bulkLabel = $('uuid-bulk-label')
  let bulk = []

  const showBulk = () => {
    bulkList.textContent = ''
    if (!bulk.length) return
    const ol = document.createElement('ol')
    for (const v of bulk) {
      const li = document.createElement('li')
      const value = document.createElement('span')
      value.className = 'v'
      value.textContent = format(v)
      const time = document.createElement('span')
      time.className = 'c'
      time.textContent = isoOf(info(v).ms).slice(11, 23)
      li.append(value, time)
      ol.appendChild(li)
    }
    bulkList.appendChild(ol)
    bulkLabel.textContent = (M.count || '{n}').replace('{n}', String(bulk.length))
  }
  $('uuid-bulk').addEventListener('click', () => {
    const want = Math.min(1000, Math.max(1, parseInt($('uuid-bulk-count').value, 10) || 1))
    const ms = customMs()
    const state = ms === null ? liveState : newState()
    bulk = []
    for (let i = 0; i < want; i++) bulk.push(next(state, ms === null ? Date.now() : ms))
    showBulk()
  })

  const redraw = () => {
    showCurrent()
    showBulk()
  }
  hyphenEl.addEventListener('change', redraw)
  upperEl.addEventListener('change', redraw)

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
  const flash = (btn, ok) => {
    const label = btn.dataset.label || btn.textContent
    btn.dataset.label = label
    btn.textContent = ok ? M.copied : label
    btn.classList.toggle('done', ok)
    setTimeout(() => {
      btn.textContent = label
      btn.classList.remove('done')
    }, 1400)
  }
  root.querySelectorAll('[data-copy-field]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const box = btn.closest('[data-result]')
      const field = box && box.querySelector('[data-field="' + btn.dataset.copyField + '"]')
      const text = field ? field.textContent.trim() : ''
      if (!text || text === '-') return
      flash(btn, await copy(text))
    })
  })
  $('uuid-bulk-copy').addEventListener('click', async (e) => {
    if (!bulk.length) return
    flash(e.currentTarget, await copy(bulk.map(format).join('\n')))
  })

  // ── 이력 (localStorage, 최근 10개): 풀어 본 UUID ──
  const HKEY = 'iinow:uuid7:history'
  const HMAX = 10
  const histEl = $('uuid-hist')
  const histEmpty = $('uuid-hist-empty')

  const loadHist = () => {
    try {
      const v = JSON.parse(localStorage.getItem(HKEY) || '[]')
      return Array.isArray(v) ? v.filter((e) => e && typeof e.text === 'string') : []
    } catch (e) {
      return []
    }
  }
  const renderHist = () => {
    const list = loadHist()
    histEl.textContent = ''
    for (const entry of list) {
      const li = document.createElement('li')
      const btn = document.createElement('button')
      btn.type = 'button'
      const main = document.createElement('span')
      main.className = 'h-main'
      main.textContent = entry.text
      const sub = document.createElement('span')
      sub.className = 'h-sub'
      const parts = ['v' + entry.version]
      if (entry.version === 7 && typeof entry.ms === 'number') parts.push(isoOf(entry.ms))
      if (entry.at) parts.push(new Date(entry.at).toLocaleString(locale))
      sub.textContent = parts.join(' · ')
      btn.append(main, sub)
      btn.addEventListener('click', () => {
        inputEl.value = entry.text
        decode()
        inputEl.focus()
      })
      li.appendChild(btn)
      histEl.appendChild(li)
    }
    histEmpty.hidden = list.length > 0
  }
  function remember(v, d) {
    const text = canonical(v)
    const list = loadHist().filter((e) => e.text !== text)
    list.unshift({ text, version: d.version, ms: d.ms, at: Date.now() })
    try {
      localStorage.setItem(HKEY, JSON.stringify(list.slice(0, HMAX)))
    } catch (e) {
      /* 저장소를 못 쓰면 이력 없이 동작한다 */
    }
    renderHist()
  }
  $('uuid-hist-clear').addEventListener('click', () => {
    try {
      localStorage.removeItem(HKEY)
    } catch (e) {
      /* 무시 */
    }
    renderHist()
  })

  // ── 시작 ──
  renderHist()
  generate()
  if (inputEl.value.trim()) decode()
})()
