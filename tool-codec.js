// Base64 · URL 인코딩/디코딩 (/online/base64/, /online/url-encode/ 와 /en·/ja·/zh 판)
// 버튼 없이 입력할 때마다 반대쪽 칸을 다시 계산한다. 문구는 #codec 의 data-* 에서 읽는다.
;(function () {
  'use strict'

  const root = document.getElementById('codec')
  if (!root) return
  const KIND = root.dataset.codec === 'url' ? 'url' : 'base64'
  const M = root.dataset

  const $ = (id) => document.getElementById(id)
  const plainEl = $('codec-plain')
  const encodedEl = $('codec-encoded')
  const msgEl = $('codec-msg')
  const utf8 = new TextEncoder()

  // ── Base64 ──
  const toBase64 = (text, urlSafe) => {
    const bytes = utf8.encode(text)
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    }
    const out = btoa(bin)
    return { text: urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out }
  }

  // 표준·URL-safe, 패딩 유무, 줄바꿈, data URL 머리를 모두 받아들인다
  const fromBase64 = (input) => {
    const s = input
      .replace(/^\s*data:[^,]*;base64,/i, '')
      .replace(/\s+/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/=+$/, '')
    if (!/^[A-Za-z0-9+/]*$/.test(s) || s.length % 4 === 1) return { error: M.errDecode }
    const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    try {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
    } catch (e) {
      return { text: new TextDecoder('utf-8').decode(bytes), warn: M.warnUtf8 }
    }
  }

  // ── URL ──
  const urlEncode = (text, mode, plus) => {
    try {
      const out = mode === 'uri' ? encodeURI(text) : encodeURIComponent(text)
      return { text: plus ? out.replace(/%20/g, '+') : out }
    } catch (e) {
      return { error: M.errEncode }
    }
  }

  const urlDecode = (input, plus) => {
    const s = plus ? input.replace(/\+/g, ' ') : input
    try {
      return { text: decodeURIComponent(s) }
    } catch (e) {
      // 깨진 % 시퀀스는 그대로 두고 풀 수 있는 곳만 푼다
      const text = s.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
        try {
          return decodeURIComponent(run)
        } catch (err) {
          return run
        }
      })
      return { text, warn: M.errDecode }
    }
  }

  // ── 옵션 ──
  const urlSafeEl = $('codec-urlsafe')
  const plusEl = $('codec-plus')
  const mode = () => {
    const on = root.querySelector('input[name="codec-mode"]:checked')
    return on ? on.value : 'component'
  }

  const encode = (text) =>
    KIND === 'url' ? urlEncode(text, mode(), !!(plusEl && plusEl.checked)) : toBase64(text, !!(urlSafeEl && urlSafeEl.checked))
  const decode = (text) => (KIND === 'url' ? urlDecode(text, !!(plusEl && plusEl.checked)) : fromBase64(text))

  // ── 화면 ──
  const stat = (el) => {
    const out = $(el.id + '-stat')
    if (!out) return
    const chars = Array.from(el.value).length
    const bytes = utf8.encode(el.value).length
    out.textContent = chars + ' ' + M.chars + ' · ' + bytes + ' ' + M.bytes
  }

  const say = (text, kind) => {
    msgEl.textContent = text || ''
    msgEl.className = 'tool-msg' + (text ? ' ' + kind : '')
  }

  // ── 이력 (localStorage, 최근 10개) ──
  const HKEY = 'iinow:codec:' + KIND + ':history'
  const HMAX = 10
  const HLIMIT = 50000 // 이보다 긴 입력은 저장하지 않는다
  const histEl = $('codec-hist')
  const histEmpty = $('codec-hist-empty')
  const locale = document.documentElement.getAttribute('lang') || 'ko'

  const loadHist = () => {
    try {
      const v = JSON.parse(localStorage.getItem(HKEY) || '[]')
      return Array.isArray(v) ? v.filter((e) => e && typeof e.text === 'string') : []
    } catch (e) {
      return []
    }
  }
  const storeHist = (list) => {
    try {
      localStorage.setItem(HKEY, JSON.stringify(list))
    } catch (e) {
      /* 저장 공간이 없거나 막혀 있으면 이력 없이 동작한다 */
    }
  }

  const currentOpts = () =>
    KIND === 'url' ? { mode: mode(), plus: !!(plusEl && plusEl.checked) } : { urlsafe: !!(urlSafeEl && urlSafeEl.checked) }
  const applyOpts = (o) => {
    if (!o) return
    if (urlSafeEl) urlSafeEl.checked = !!o.urlsafe
    if (plusEl) plusEl.checked = !!o.plus
    if (o.mode) {
      const radio = root.querySelector('input[name="codec-mode"][value="' + (o.mode === 'uri' ? 'uri' : 'component') + '"]')
      if (radio) radio.checked = true
    }
  }

  const renderHist = () => {
    if (!histEl) return
    const list = loadHist()
    histEl.textContent = ''
    for (const entry of list) {
      const li = document.createElement('li')
      const btn = document.createElement('button')
      btn.type = 'button'
      const main = document.createElement('span')
      main.className = 'h-main'
      main.textContent = entry.text.slice(0, 160)
      const sub = document.createElement('span')
      sub.className = 'h-sub'
      const from = entry.src === 'encoded' ? M.labelEncoded : M.labelPlain
      const to = entry.src === 'encoded' ? M.labelPlain : M.labelEncoded
      const when = entry.at ? new Date(entry.at).toLocaleString(locale) : ''
      sub.textContent = from + ' → ' + to + (when ? ' · ' + when : '') + (entry.preview ? ' · ' + entry.preview : '')
      btn.append(main, sub)
      btn.addEventListener('click', () => {
        applyOpts(entry.opts)
        const src = entry.src === 'encoded' ? encodedEl : plainEl
        src.value = entry.text
        run(entry.src === 'encoded' ? 'encoded' : 'plain')
        src.focus()
      })
      li.appendChild(btn)
      histEl.appendChild(li)
    }
    if (histEmpty) histEmpty.hidden = list.length > 0
  }

  // 이어서 치는 동안에는 맨 위 항목을 갈아 끼워 한 글자마다 쌓이지 않게 한다
  let lastSaved = null
  let timer = null

  const remember = () => {
    timer = null
    if (!lastOk) return
    const text = (source === 'plain' ? plainEl : encodedEl).value
    if (!text.trim() || text.length > HLIMIT) return
    let list = loadHist()
    const top = list[0]
    if (
      lastSaved && top && top.src === lastSaved.src && top.text === lastSaved.text && lastSaved.src === source &&
      (text.startsWith(lastSaved.text) || lastSaved.text.startsWith(text))
    ) {
      list.shift()
    }
    list = list.filter((e) => !(e.src === source && e.text === text))
    const other = (source === 'plain' ? encodedEl : plainEl).value
    list.unshift({ src: source, text, preview: other.slice(0, 80), opts: currentOpts(), at: Date.now() })
    storeHist(list.slice(0, HMAX))
    lastSaved = { src: source, text }
    renderHist()
  }
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(remember, 800)
  }
  const flush = () => {
    if (!timer) return
    clearTimeout(timer)
    remember()
  }

  // 마지막으로 손댄 칸이 기준이다. 옵션을 바꾸면 그 칸에서 다시 계산한다.
  let source = 'plain'
  let lastOk = false

  const run = (from) => {
    source = from
    lastOk = false
    const src = from === 'plain' ? plainEl : encodedEl
    const dst = from === 'plain' ? encodedEl : plainEl
    if (src.value === '') {
      dst.value = ''
      say('')
    } else {
      const r = from === 'plain' ? encode(src.value) : decode(src.value)
      if (r.error) {
        dst.value = ''
        say(r.error, 'bad')
      } else {
        dst.value = r.text
        say(r.warn, 'bad')
        lastOk = true
      }
    }
    stat(plainEl)
    stat(encodedEl)
    schedule()
  }

  plainEl.addEventListener('input', () => run('plain'))
  encodedEl.addEventListener('input', () => run('encoded'))
  root.querySelectorAll('.codec-opts input').forEach((el) => {
    el.addEventListener('change', () => run(source))
  })

  $('codec-sample').addEventListener('click', () => {
    plainEl.value = M.sample || ''
    run('plain')
    plainEl.focus()
  })
  $('codec-clear').addEventListener('click', () => {
    flush()
    lastSaved = null
    plainEl.value = ''
    encodedEl.value = ''
    run('plain')
    plainEl.focus()
  })

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

  root.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.textContent
    btn.addEventListener('click', async () => {
      const target = $(btn.dataset.copy)
      if (!target || !target.value) return
      const ok = await copy(target.value)
      btn.textContent = ok ? M.copied : label
      btn.classList.toggle('done', ok)
      setTimeout(() => {
        btn.textContent = label
        btn.classList.remove('done')
      }, 1400)
    })
  })

  plainEl.addEventListener('change', flush)
  encodedEl.addEventListener('change', flush)
  window.addEventListener('pagehide', flush)
  const histClear = $('codec-hist-clear')
  if (histClear) {
    histClear.addEventListener('click', () => {
      if (timer) clearTimeout(timer)
      timer = null
      lastSaved = null
      try {
        localStorage.removeItem(HKEY)
      } catch (e) {
        /* 무시 */
      }
      renderHist()
    })
  }
  renderHist()

  // 브라우저가 새로 고침 뒤 입력값을 되살렸을 때도 결과를 맞춘다
  if (plainEl.value) run('plain')
  else if (encodedEl.value) run('encoded')
})()
