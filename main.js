// PWA: 홈 화면에 추가했을 때와 오프라인에서도 열리도록 서비스 워커를 등록한다.
// 캐시 전략은 sw.js 에 있다(페이지는 네트워크 우선, 정적 파일은 저장본 먼저).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// ── 언어: <html lang> 하나로 문구를 고른다 (ko / en / ja / zh-CN) ──
const LANG = (() => {
  const l = (document.documentElement.getAttribute('lang') || 'ko').toLowerCase()
  if (l.startsWith('zh')) return 'zh'
  if (l.startsWith('ja')) return 'ja'
  if (l.startsWith('en')) return 'en'
  return 'ko'
})()
const EN = LANG === 'en'

// ── lite-oc 글: 따로 띄우던 서비스가 상자 하나로 들어간다 ──
const SERVICES = {
  ko: [
    'PostgreSQL', 'Mosquitto MQTT', 'S3 저장소', 'SQS 큐', 'nginx 프록시', 'edge nginx',
    'Tailscale', '백오피스', '태블릿 화면', '세션 만료 작업', 'CCTV 중계',
    'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
  ],
  en: [
    'PostgreSQL', 'Mosquitto MQTT', 'S3 storage', 'SQS queue', 'nginx proxy', 'edge nginx',
    'Tailscale', 'Back office', 'Tablet screen', 'Session expiry job', 'CCTV relay',
    'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
  ],
  ja: [
    'PostgreSQL', 'Mosquitto MQTT', 'S3 ストレージ', 'SQS キュー', 'nginx プロキシ', 'edge nginx',
    'Tailscale', 'バックオフィス', 'タブレット画面', 'セッション期限切れジョブ', 'CCTV 中継',
    'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
  ],
  zh: [
    'PostgreSQL', 'Mosquitto MQTT', 'S3 存储', 'SQS 队列', 'nginx 代理', 'edge nginx',
    'Tailscale', '后台管理', '平板界面', '会话过期任务', 'CCTV 中继',
    'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
  ],
}[LANG]
const cloud = document.getElementById('cloud')
if (cloud) {
  const box = document.getElementById('box')
  const countEl = document.getElementById('count')
  const replay = document.getElementById('replay')
  const unitEl = box.querySelector('.count .unit')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const TOTAL = SERVICES.length + 1 // + Go 서버 자신
  const BOOK_UNIT = { ko: '개', ja: '個', zh: '个' }
  const unit = (n) => (EN ? (n === 1 ? 'service' : 'services') : BOOK_UNIT[LANG])

  const chips = SERVICES.map((name) => {
    const el = document.createElement('span')
    el.className = 'chip'
    el.textContent = name
    cloud.appendChild(el)
    return el
  })

  function finish() {
    chips.forEach((c) => c.classList.add('gone'))
    countEl.textContent = '1'
    if (unitEl) unitEl.textContent = unit(1)
    box.classList.add('done')
    replay.disabled = false
  }

  function reset() {
    chips.forEach((c) => c.classList.remove('gone'))
    countEl.textContent = String(TOTAL)
    if (unitEl) unitEl.textContent = unit(TOTAL)
    box.classList.remove('done')
  }

  function play() {
    if (reduced || !Element.prototype.animate) return finish()
    replay.disabled = true
    reset()
    let left = TOTAL
    let landed = 0
    chips.forEach((chip, i) => {
      setTimeout(() => {
        const from = chip.getBoundingClientRect()
        const to = box.getBoundingClientRect()
        const fly = chip.cloneNode(true)
        fly.classList.add('fly')
        fly.style.left = from.left + 'px'
        fly.style.top = from.top + 'px'
        document.body.appendChild(fly)
        chip.classList.add('gone')
        const dx = to.left + to.width / 2 - (from.left + from.width / 2)
        const dy = to.top + to.height / 2 - (from.top + from.height / 2)
        fly.animate(
          [
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(0.9)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0 },
          ],
          { duration: 620, easing: 'cubic-bezier(.5,0,.75,.4)' }
        ).onfinish = () => {
          fly.remove()
          left -= 1
          countEl.textContent = String(left)
          if (unitEl) unitEl.textContent = unit(left)
          box.classList.remove('hit')
          void box.offsetWidth
          box.classList.add('hit')
          if (++landed === chips.length) finish()
        }
      }, 700 + i * 130)
    })
  }

  replay.addEventListener('click', play)
  replay.disabled = true
  // 상자가 화면에 들어오면 한 번 재생
  const tryPlay = () => {
    const r = box.getBoundingClientRect()
    if (r.top > innerHeight - r.height * 0.5 || r.bottom < 0) return
    removeEventListener('scroll', tryPlay)
    play()
  }
  addEventListener('scroll', tryPlay, { passive: true })
  if (document.readyState === 'complete') tryPlay()
  else addEventListener('load', tryPlay)
}

// ── 화면 탭: <div class="shots"> 마다 따로 동작 ──
document.querySelectorAll('.shots').forEach((shots) => {
  const tabs = [...shots.querySelectorAll('[role=tab]')]
  const img = shots.querySelector('figure img')
  const cap = shots.querySelector('figcaption')
  if (!tabs.length || !img) return
  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab
      t.setAttribute('aria-selected', on)
      t.tabIndex = on ? 0 : -1
    })
    if (img.getAttribute('src') === tab.dataset.img) return
    const next = new Image()
    img.classList.add('swap')
    next.onload = () => {
      img.src = tab.dataset.img
      const SCREEN = { ko: ' 화면', ja: ' 画面', zh: ' 界面' }
      img.alt = tab.textContent + (EN ? ' screen' : SCREEN[LANG])
      if (cap) cap.textContent = tab.dataset.cap || ''
      img.classList.remove('swap')
    }
    next.src = tab.dataset.img
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab))
    tab.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (!d) return
      const n = tabs[(i + d + tabs.length) % tabs.length]
      n.focus()
      select(n)
    })
  })
  select(tabs[0])
})

// ── 글 안의 그림은 누르면 크게 ──
const viewer = document.getElementById('viewer')
const viewerImg = document.getElementById('viewer-img')
document.querySelectorAll('.prose img').forEach((img) => {
  img.tabIndex = 0
  img.setAttribute('role', 'button')
  const IMG_WORD = { ko: '그림', ja: '画像', zh: '图片' }
  const IMG_MORE = { ko: ' 크게 보기', ja: ' 拡大表示', zh: ' 放大查看' }
  img.setAttribute('aria-label', (img.alt || (EN ? 'Image' : IMG_WORD[LANG])) + (EN ? ', view larger' : IMG_MORE[LANG]))
  const open = () => {
    viewerImg.src = img.src
    viewerImg.alt = img.alt
    viewer.showModal()
  }
  img.addEventListener('click', open)
  img.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() }
  })
})
viewer.addEventListener('click', (e) => {
  if (e.target === viewer) viewer.close()
})

// ── 글 안의 ```mermaid 블록: 코드가 아니라 그림으로 ──
// Kramdown 은 ```mermaid 를 <pre><code class="language-mermaid"> 로 남긴다.
// 그 블록이 있는 글에서만 Mermaid 를 내려받아 그리고, 없으면 아무것도 하지 않는다.
const mermaidCodes = [...document.querySelectorAll('.prose pre > code.language-mermaid')]
if (mermaidCodes.length) {
  const dark = matchMedia('(prefers-color-scheme: dark)')
  const diagrams = mermaidCodes.map((code) => {
    const holder = document.createElement('div')
    holder.className = 'mermaid'
    holder.textContent = code.textContent
    // Rouge 가 <div class="language-mermaid highlighter-rouge">…</div> 로 감싸 두므로 그 껍데기까지 걷어낸다.
    const block = code.closest('.highlighter-rouge') || code.parentElement
    block.replaceWith(holder)
    return { holder, source: code.textContent }
  })
  let mermaid = null
  let busy = false
  // 사이트 색(--ink, --paper …)을 그대로 읽어 와 그림 색을 맞춘다. 다크 모드면 다크 값이 온다.
  const palette = () => {
    const css = getComputedStyle(document.documentElement)
    const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
    const ink = v('--ink', '#1b1e3c')
    const paper = v('--paper', '#eef0f8')
    const surface = v('--surface', '#ffffff')
    const line = v('--line', '#d3d7e8')
    return {
      fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
      fontSize: '15px',
      background: paper,
      primaryColor: surface,
      primaryTextColor: ink,
      primaryBorderColor: ink,
      secondaryColor: '#ffc93c',
      secondaryTextColor: '#1b1e3c',
      secondaryBorderColor: '#1b1e3c',
      tertiaryColor: paper,
      tertiaryTextColor: ink,
      tertiaryBorderColor: line,
      lineColor: ink,
      textColor: ink,
      mainBkg: surface,
      nodeBorder: ink,
      clusterBkg: paper,
      clusterBorder: line,
      edgeLabelBackground: paper,
      titleColor: ink,
      noteBkgColor: '#ffc93c',
      noteTextColor: '#1b1e3c',
      noteBorderColor: '#1b1e3c',
      actorBkg: surface,
      actorTextColor: ink,
      actorBorder: ink,
      actorLineColor: ink,
      signalColor: ink,
      signalTextColor: ink,
      labelBoxBkgColor: surface,
      labelBoxBorderColor: ink,
      labelTextColor: ink,
      loopTextColor: ink,
      activationBkgColor: paper,
      activationBorderColor: ink,
      sequenceNumberColor: '#1b1e3c',
    }
  }
  // 좁은 화면에서 글자를 뭉개지 않게: 그림이 상자보다 넓으면 원래 크기로 두고 가로 스크롤한다.
  // 넓은 화면에서는 Mermaid 가 붙인 max-width 를 그대로 두어 상자 폭에 맞춰 줄인다.
  const fit = (holder) => {
    const svg = holder.querySelector('svg')
    if (!svg) return
    const cs = getComputedStyle(holder)
    const box = holder.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    const vb = svg.viewBox && svg.viewBox.baseVal
    const natural = vb && vb.width ? vb.width : svg.getBoundingClientRect().width
    if (box > 0 && box < 640 && natural > box + 1) {
      if (!svg.dataset.ownMax) svg.dataset.ownMax = svg.style.maxWidth || 'none'
      svg.style.maxWidth = 'none'
      svg.style.width = natural + 'px'
      svg.style.minWidth = natural + 'px'
    } else if (svg.dataset.ownMax) {
      svg.style.maxWidth = svg.dataset.ownMax === 'none' ? '' : svg.dataset.ownMax
      svg.style.width = ''
      svg.style.minWidth = ''
      delete svg.dataset.ownMax
    }
  }
  const render = async () => {
    if (busy) return
    busy = true
    try {
      if (!mermaid) {
        const mod = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')
        mermaid = mod.default
      }
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: palette(),
        securityLevel: 'strict',
        flowchart: { curve: 'basis', useMaxWidth: true, padding: 14, nodeSpacing: 42, rankSpacing: 48 },
        sequence: { useMaxWidth: true, mirrorActors: false },
      })
      for (const d of diagrams) {
        d.holder.removeAttribute('data-processed')
        d.holder.textContent = d.source
      }
      // 한 그림이 깨져도 나머지는 그린다
      await mermaid.run({ nodes: diagrams.map((d) => d.holder), suppressErrors: true })
      diagrams.forEach((d) => fit(d.holder))
    } catch (e) {
      // 내려받기가 막히면 원래 코드 블록으로 되돌린다
      console.warn('mermaid: ' + (e && e.message))
      for (const d of diagrams) {
        if (d.holder.querySelector('svg')) continue
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.className = 'language-mermaid'
        code.textContent = d.source
        pre.appendChild(code)
        d.holder.replaceWith(pre)
      }
    } finally {
      busy = false
    }
  }
  render()
  // OS 가 다크 모드로 바뀌거나 손으로 테마를 바꾸면 색을 다시 맞춰 그린다
  if (dark.addEventListener) dark.addEventListener('change', () => render())
  document.addEventListener('themechange', () => render())
  let resizeTimer = 0
  addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => diagrams.forEach((d) => fit(d.holder)), 150)
  }, { passive: true })
}

// ── 글 안의 표: 본문 폭을 넘으면 표만 가로로 스크롤 ──
// nowrap 코드 때문에 첫 열이 한 글자씩 쪼개지는 문제를 막는다.
document.querySelectorAll('.prose table').forEach((table) => {
  const parent = table.parentElement
  if (!parent || parent.classList.contains('table-scroll')) return
  const wrap = document.createElement('div')
  wrap.className = 'table-scroll'
  parent.insertBefore(wrap, table)
  wrap.appendChild(table)
})

// ── 우측 목차: 본문 헤딩을 모아 스크롤에 따라 현재 위치를 표시 ──
// id 가 없는 헤딩에는 슬러그를 붙이고, 항목이 둘 이상일 때만 목차를 보여 준다.
const toc = document.getElementById('toc')
if (toc) {
  const slug = (text) =>
    text
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  const entries = []
  const seen = new Set()
  document.querySelectorAll('.prose h2, .prose h3').forEach((h, i) => {
    let id = h.id
    if (!id) {
      const base = slug(h.textContent) || 'section-' + (i + 1)
      id = base
      let n = 2
      while (seen.has(id) || document.getElementById(id)) id = base + '-' + n++
      h.id = id
    }
    seen.add(id)
    entries.push({ id, level: h.tagName === 'H3' ? 3 : 2, text: h.textContent.trim() })
  })
  const list = toc.querySelector('.toc-list')
  if (list && entries.length > 1) {
    entries.forEach((entry) => {
      const li = document.createElement('li')
      li.className = 'lvl-' + entry.level
      const a = document.createElement('a')
      a.href = '#' + entry.id
      a.textContent = entry.text
      li.appendChild(a)
      list.appendChild(li)
    })
    toc.hidden = false

    // 좁은 화면: 오른쪽 아래 버튼으로 목차 카드를 여닫는다
    const toggle = document.getElementById('toc-toggle')
    const narrow = matchMedia('(max-width: 1239.98px)')
    if (toggle) toggle.hidden = false

    const links = [...list.querySelectorAll('a')]
    const targets = entries.map((entry) => document.getElementById(entry.id))
    const header = document.querySelector('.top')
    let active = -1
    // 목차가 길어 스크롤될 때 현재 항목이 보이게
    const reveal = (i) => {
      const a = links[i]
      if (!a || !toc.clientHeight) return
      if (toc.scrollHeight <= toc.clientHeight + 2) return
      const r = a.getBoundingClientRect()
      const box = toc.getBoundingClientRect()
      if (r.top < box.top) toc.scrollTop += r.top - box.top - 8
      else if (r.bottom > box.bottom) toc.scrollTop += r.bottom - box.bottom + 8
    }
    const setActive = (i) => {
      if (i === active) return
      active = i
      links.forEach((a, n) => {
        if (n === i) a.setAttribute('aria-current', 'true')
        else a.removeAttribute('aria-current')
      })
      reveal(i)
    }
    const spy = () => {
      const top = (header ? header.offsetHeight : 0) + 24
      let current = 0
      targets.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= top) current = i
      })
      // 바닥까지 내려갔으면 마지막 섹션을 가리킨다
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) {
        current = targets.length - 1
      }
      setActive(current)
    }
    let ticking = false
    addEventListener(
      'scroll',
      () => {
        if (ticking) return
        ticking = true
        requestAnimationFrame(() => {
          ticking = false
          spy()
        })
      },
      { passive: true }
    )
    addEventListener('resize', spy, { passive: true })

    // ── 좁은 화면의 떠 있는 목차 버튼과 카드 ──
    if (toggle) {
      let openToc = false
      const setOpen = (open, refocus) => {
        openToc = open
        toc.classList.toggle('toc-open', open)
        toggle.setAttribute('aria-expanded', String(open))
        // 카드가 그려진 다음에 현재 섹션이 보이도록 스크롤한다
        if (open) requestAnimationFrame(() => reveal(active))
        else if (refocus) toggle.focus()
      }
      toggle.addEventListener('click', () => setOpen(!openToc))
      // 항목을 눌러 이동하면 카드는 저절로 닫는다
      toc.addEventListener('click', (e) => {
        if (e.target.closest('a') && narrow.matches) setOpen(false)
      })
      // 바깥을 누르거나 Esc 로도 닫힌다
      document.addEventListener('click', (e) => {
        if (!openToc) return
        if (toc.contains(e.target) || toggle.contains(e.target)) return
        setOpen(false)
      })
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && openToc) {
          e.stopPropagation()
          setOpen(false, true)
        }
      })
      // 넓은 화면으로 바뀌면 카드는 쓰이지 않으니 닫아 둔다
      narrow.addEventListener('change', () => {
        if (!narrow.matches && openToc) setOpen(false)
      })
    }

    spy()
  }
}

// ── 글 목록 분류(개발·여행) 거르기 ──
const filterBar = document.querySelector('.filter')
if (filterBar) {
  const items = [...document.querySelectorAll('.list li[data-cat]')]
  const buttons = [...filterBar.querySelectorAll('button[data-cat]')]
  const allCat = filterBar.dataset.all || '전체'
  const apply = (cat) => {
    buttons.forEach((b) => {
      const on = b.dataset.cat === cat
      b.classList.toggle('on', on)
      b.setAttribute('aria-pressed', String(on))
    })
    items.forEach((li) => { li.hidden = cat !== allCat && li.dataset.cat !== cat })
  }
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-cat]')
    if (!btn) return
    const cat = btn.dataset.cat
    apply(cat)
    const url = location.pathname + (cat === allCat ? '' : '?cat=' + encodeURIComponent(cat)) + '#posts'
    try { history.replaceState(null, '', url) } catch (err) {}
  })
  // 글 안의 분류 표시에서 /?cat=… 로 들어온 경우
  const want = new URLSearchParams(location.search).get('cat')
  apply(buttons.some((b) => b.dataset.cat === want) ? want : allCat)
}

// ── 왼쪽 메뉴 ──
// 넓은 화면: 기본 펼침, 햄버거로 접고 펴며 상태를 기억한다.
// 좁은 화면: 기본 숨김, 햄버거로 덮어 열고 바깥·Esc·링크로 닫는다.
const side = document.getElementById('side')
const burger = document.getElementById('burger')
if (side && burger) {
  const root = document.documentElement
  const wide = matchMedia('(min-width: 1000px)')
  const isOpen = () => (wide.matches ? !root.classList.contains('side-closed') : root.classList.contains('side-open'))
  const sync = () => {
    const open = isOpen()
    burger.setAttribute('aria-expanded', open)
    burger.setAttribute('aria-label', open ? (burger.dataset.labelClose || '메뉴 접기') : (burger.dataset.labelOpen || '메뉴 펼치기'))
    side.inert = !open
  }
  const set = (open) => {
    if (wide.matches) {
      root.classList.toggle('side-closed', !open)
      try { localStorage.setItem('side', open ? 'open' : 'closed') } catch (e) {}
    } else {
      root.classList.toggle('side-open', open)
    }
    sync()
  }
  burger.addEventListener('click', () => set(!isOpen()))
  document.getElementById('side-backdrop').addEventListener('click', () => set(false))
  side.addEventListener('click', (e) => {
    if (!wide.matches && e.target.closest('a')) set(false)
  })
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !wide.matches && isOpen()) { set(false); burger.focus() }
  })
  wide.addEventListener('change', () => { root.classList.remove('side-open'); sync() })
  if (location.hash === '#menu' && !wide.matches) set(true)
  sync()
}

// ── 언어 선택 ──
// 지구본 버튼(요약)을 누르면 KO / EN / JA / ZH 목록이 열린다.
// 여닫는 기본 동작은 <details> 가 맡고, 여기서는 바깥 클릭·Esc·링크 이동에서 닫는다.
const langBox = document.getElementById('lang-box')
if (langBox) {
  const langBtn = langBox.querySelector('.lang-btn')
  const closeLang = (focus) => {
    if (!langBox.open) return
    langBox.open = false
    if (focus && langBtn) langBtn.focus()
  }
  document.addEventListener('click', (e) => {
    if (!langBox.contains(e.target)) closeLang(false)
  })
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && langBox.open) {
      e.stopPropagation()
      closeLang(true)
    }
  })
  langBox.querySelectorAll('.lang-menu a').forEach((a) => {
    a.addEventListener('click', () => closeLang(false))
  })
}

// ── 라이트/다크 손전환 ──
// <head> 인라인 스크립트가 data-theme 을 먼저 세팅해 깜빡임을 막는다.
// 손으로 고른 값은 localStorage(theme) 에 남고, 고르지 않았으면 OS 설정을 따라간다.
const docEl = document.documentElement
const themeToggle = document.getElementById('theme-toggle')
const themeMeta = document.getElementById('theme-color')
const systemDark = matchMedia('(prefers-color-scheme: dark)')
const storedTheme = () => {
  try {
    const v = localStorage.getItem('theme')
    return v === 'light' || v === 'dark' ? v : null
  } catch (e) {
    return null
  }
}
const currentTheme = () => (docEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
const paintTheme = (theme, notify) => {
  docEl.setAttribute('data-theme', theme)
  if (themeToggle) {
    const dark = theme === 'dark'
    themeToggle.setAttribute('aria-pressed', String(dark))
    const label = themeToggle.dataset[dark ? 'labelLight' : 'labelDark']
    if (label) {
      themeToggle.setAttribute('aria-label', label)
      themeToggle.title = label
    }
  }
  if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#14162b' : '#1B1E3C')
  if (notify) document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
  syncGiscusTheme()
}
// giscus 댓글이 켜져 있으면 지금 테마를 iframe 에 알려 준다
const syncGiscusTheme = () => {
  const frame = document.querySelector('.giscus iframe')
  if (frame && frame.contentWindow) {
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme: currentTheme() } } }, 'https://giscus.app')
  }
}
paintTheme(currentTheme(), false)
// giscus iframe 은 늦게 붙으므로 붙는 순간과 로드 직후에 테마를 다시 보낸다
const giscusHost = document.querySelector('.giscus')
if (giscusHost) {
  new MutationObserver(() => syncGiscusTheme()).observe(giscusHost, { childList: true, subtree: true })
  addEventListener('load', () => setTimeout(syncGiscusTheme, 600))
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem('theme', next) } catch (e) {}
    paintTheme(next, true)
  })
}
// 아직 테마를 고르지 않았으면 OS 설정이 바뀔 때 따라간다
if (!storedTheme() && systemDark.addEventListener) {
  systemDark.addEventListener('change', (e) => paintTheme(e.matches ? 'dark' : 'light', true))
}

// ── 코드 블록 복사 버튼 ──
// Mermaid 로 바뀐 블록은 그림이라 건너뛴다.
const COPY_TEXT = {
  ko: { copy: '복사', done: '복사됨 ✓', fail: '복사 실패' },
  en: { copy: 'Copy', done: 'Copied ✓', fail: 'Copy failed' },
  ja: { copy: 'コピー', done: 'コピーしました ✓', fail: 'コピーできませんでした' },
  zh: { copy: '复制', done: '已复制 ✓', fail: '复制失败' },
}[LANG]
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    // 클립보드 API 가 막힌 곳(비 https, 오래된 브라우저)은 예전 방식으로
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
document.querySelectorAll('.prose pre').forEach((pre) => {
  if (pre.closest('.mermaid') || pre.querySelector('code.language-mermaid')) return
  const block = pre.closest('.highlighter-rouge') || pre
  if (block.classList.contains('code-block')) return
  block.classList.add('code-block')
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'code-copy'
  btn.textContent = COPY_TEXT.copy
  btn.setAttribute('aria-label', COPY_TEXT.copy)
  let timer = 0
  btn.addEventListener('click', async () => {
    const code = pre.querySelector('code') || pre
    const text = code.textContent.replace(/\s+$/, '')
    const ok = await copyText(text)
    btn.textContent = ok ? COPY_TEXT.done : COPY_TEXT.fail
    btn.classList.toggle('done', ok)
    btn.setAttribute('aria-label', ok ? COPY_TEXT.done : COPY_TEXT.fail)
    clearTimeout(timer)
    timer = setTimeout(() => {
      btn.textContent = COPY_TEXT.copy
      btn.classList.remove('done')
      btn.setAttribute('aria-label', COPY_TEXT.copy)
    }, 1600)
  })
  block.appendChild(btn)
})

// ── 글 읽기 진행률 ──
const progress = document.getElementById('read-progress')
if (progress) {
  const fill = progress.querySelector('.read-progress-fill')
  const article = document.querySelector('.post')
  const head = document.querySelector('.top')
  let raf = 0
  const draw = () => {
    raf = 0
    if (!fill) return
    let ratio = 0
    if (article) {
      const start = article.offsetTop - (head ? head.offsetHeight : 0)
      const end = article.offsetTop + article.offsetHeight - innerHeight
      if (end > start) ratio = (scrollY - start) / (end - start)
      else ratio = scrollY > start ? 1 : 0
    } else {
      const max = document.documentElement.scrollHeight - innerHeight
      ratio = max > 0 ? scrollY / max : 1
    }
    fill.style.transform = 'scaleX(' + Math.min(1, Math.max(0, ratio)).toFixed(4) + ')'
  }
  const request = () => {
    if (raf) return
    raf = requestAnimationFrame(draw)
  }
  addEventListener('scroll', request, { passive: true })
  addEventListener('resize', request, { passive: true })
  draw()
}

// ── 글 검색 (Ctrl+K / Cmd+K) ──
const searchDialog = document.getElementById('search')
if (searchDialog) {
  const input = document.getElementById('search-input')
  const list = document.getElementById('search-results')
  const statusEl = document.getElementById('search-status')
  const openBtn = document.getElementById('search-open')
  const closeBtn = document.getElementById('search-close')
  const shortcut = document.getElementById('search-shortcut')
  const SEARCH_TEXT = {
    ko: {
      recent: '최근 글',
      hint: '검색어를 입력하세요',
      count: (n) => n + '개 결과',
      none: (q) => '“' + q + '” 결과가 없습니다',
      broken: '검색 색인을 불러오지 못했습니다.',
      post: '글',
      page: '도구',
    },
    en: {
      recent: 'Recent posts',
      hint: 'Type to search',
      count: (n) => n + (n === 1 ? ' result' : ' results'),
      none: (q) => 'No results for “' + q + '”',
      broken: 'Search index could not be loaded.',
      post: 'Post',
      page: 'Tool',
    },
    ja: {
      recent: '最新の記事',
      hint: '検索語を入力してください',
      count: (n) => n + ' 件',
      none: (q) => '「' + q + '」の結果はありません',
      broken: '検索インデックスを読み込めませんでした。',
      post: '記事',
      page: 'ツール',
    },
    zh: {
      recent: '最近文章',
      hint: '请输入搜索词',
      count: (n) => n + ' 条结果',
      none: (q) => '没有找到“' + q + '”的结果',
      broken: '搜索索引加载失败。',
      post: '文章',
      page: '工具',
    },
  }[LANG]
  const LANG_LABEL = { ko: 'KO', en: 'EN', ja: 'JA', zh: 'ZH' }
  let index = null
  let loading = null
  let results = []
  let tokens = []
  let active = -1
  let query = ''

  if (shortcut && /Mac|iPhone|iPad/.test(navigator.platform || '')) shortcut.textContent = '⌘ K'

  const loadIndex = () => {
    if (index) return Promise.resolve(index)
    if (!loading) {
      loading = fetch('/search.json')
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => (index = Array.isArray(data) ? data : []))
        .catch(() => (index = []))
    }
    return loading
  }

  const norm = (s) => String(s || '').toLowerCase()
  // 라틴 문자 검색어는 단어 경계로 본다 ("tsid" 가 "outside" 안에서 걸리지 않게).
  // 한글은 조사가 붙으므로 부분 문자열 그대로 찾는다.
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const findWord = (hay, w) => {
    if (!hay) return -1
    if (!/^[\x00-\x7F]+$/.test(w)) return hay.indexOf(w)
    const m = new RegExp('(^|[^a-z0-9])' + escapeRe(w)).exec(hay)
    return m ? m.index + m[1].length : -1
  }
  const scoreOf = (doc, words) => {
    const title = norm(doc.title)
    const summary = norm(doc.summary)
    const category = norm(doc.category)
    const content = norm(doc.content)
    let score = 0
    for (const w of words) {
      let s = 0
      const at = findWord(title, w)
      if (at !== -1) s += at === 0 ? 14 : 9
      if (findWord(summary, w) !== -1) s += 4
      if (findWord(category, w) !== -1) s += 3
      if (findWord(content, w) !== -1) s += 1
      if (!s) return 0
      score += s
    }
    return score
  }

  // 검색어와 겹치는 부분만 <mark> 로 감싼다 (글자열은 DOM 으로만 넣는다)
  const markText = (text, words) => {
    const frag = document.createDocumentFragment()
    if (!words.length || !text) {
      frag.appendChild(document.createTextNode(text || ''))
      return frag
    }
    const lower = text.toLowerCase()
    let i = 0
    while (i < text.length) {
      let best = -1
      let len = 0
      for (const w of words) {
        const at = lower.indexOf(w, i)
        if (at !== -1 && (best === -1 || at < best || (at === best && w.length > len))) {
          best = at
          len = w.length
        }
      }
      if (best === -1) {
        frag.appendChild(document.createTextNode(text.slice(i)))
        break
      }
      if (best > i) frag.appendChild(document.createTextNode(text.slice(i, best)))
      const m = document.createElement('mark')
      m.textContent = text.slice(best, best + len)
      frag.appendChild(m)
      i = best + len
    }
    return frag
  }

  const snippetOf = (doc) => {
    const text = String(doc.summary || doc.content || '').replace(/\s+/g, ' ').trim()
    if (!query || !text) return text.slice(0, 140)
    const lower = text.toLowerCase()
    let at = -1
    for (const w of tokens) {
      const i = findWord(lower, w)
      if (i !== -1 && (at === -1 || i < at)) at = i
    }
    if (at <= 40) {
      const cut = Math.min(text.length, 140)
      const sp = text.lastIndexOf(' ', cut)
      const end = cut < text.length && sp > 60 ? sp : cut
      return text.slice(0, end) + (end < text.length ? '…' : '')
    }
    let start = Math.max(0, at - 40)
    if (start > 0) {
      const sp = text.indexOf(' ', start)
      if (sp !== -1 && sp < at) start = sp + 1
    }
    let end = Math.min(text.length, at + 110)
    if (end < text.length) {
      const sp = text.lastIndexOf(' ', end)
      if (sp > at) end = sp
    }
    return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
  }

  const setActive = (i) => {
    const items = [...list.children]
    if (!items.length) {
      active = -1
      input.removeAttribute('aria-activedescendant')
      return
    }
    active = ((i % items.length) + items.length) % items.length
    items.forEach((li, n) => li.setAttribute('aria-selected', String(n === active)))
    input.setAttribute('aria-activedescendant', items[active].id)
    items[active].scrollIntoView({ block: 'nearest' })
  }

  const renderResults = () => {
    list.textContent = ''
    active = -1
    results.forEach((doc, i) => {
      const li = document.createElement('li')
      li.id = 'search-opt-' + i
      li.setAttribute('role', 'option')
      li.setAttribute('aria-selected', 'false')
      const a = document.createElement('a')
      a.href = doc.url
      const title = document.createElement('span')
      title.className = 'r-title'
      title.appendChild(markText(doc.title || doc.url, tokens))
      const meta = document.createElement('span')
      meta.className = 'r-meta'
      meta.textContent = [
        doc.kind === 'page' ? SEARCH_TEXT.page : SEARCH_TEXT.post,
        doc.date,
        doc.category,
        LANG_LABEL[doc.lang === 'en' || doc.lang === 'ja' || doc.lang === 'zh' ? doc.lang : 'ko'],
      ]
        .filter(Boolean)
        .join(' · ')
      const sum = document.createElement('span')
      sum.className = 'r-sum'
      sum.appendChild(markText(snippetOf(doc), tokens))
      a.append(title, meta, sum)
      li.appendChild(a)
      list.appendChild(li)
    })
    if (results.length) setActive(0)
  }

  const update = async () => {
    query = input.value.trim()
    tokens = norm(query).split(/\s+/).filter(Boolean)
    await loadIndex()
    if (!index || !index.length) {
      results = []
      list.textContent = ''
      statusEl.textContent = SEARCH_TEXT.broken
      return
    }
    // 지금 보고 있는 언어의 글·도구만 보여 준다
    const scoped = index.filter((doc) => (doc.lang || 'ko') === LANG)
    if (!tokens.length) {
      results = scoped
        .slice()
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .slice(0, 6)
      statusEl.textContent = SEARCH_TEXT.recent
    } else {
      results = scoped
        .map((doc) => ({ doc, score: scoreOf(doc, tokens) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || String(b.doc.date || '').localeCompare(String(a.doc.date || '')))
        .slice(0, 20)
        .map((x) => x.doc)
      statusEl.textContent = results.length ? SEARCH_TEXT.count(results.length) : SEARCH_TEXT.none(query)
    }
    renderResults()
  }

  const openSearch = () => {
    if (!searchDialog.open) searchDialog.showModal()
    input.focus()
    input.select()
    update()
  }

  openBtn.addEventListener('click', openSearch)
  closeBtn.addEventListener('click', () => searchDialog.close())
  input.addEventListener('input', update)
  input.addEventListener('focus', () => {
    if (!results.length && !input.value.trim()) update()
  })
  // 바깥(어두운 배경)을 누르면 닫는다
  searchDialog.addEventListener('click', (e) => {
    if (e.target === searchDialog) searchDialog.close()
  })

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey
    if (!searchDialog.open) {
      if (mod && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        openSearch()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(active + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(active - 1)
    } else if (e.key === 'Enter') {
      const doc = results[active] || results[0]
      if (doc) {
        e.preventDefault()
        location.href = doc.url
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      searchDialog.close()
    }
  })
}
