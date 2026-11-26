// 옛 PWA 서비스 워커 정리
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {})
}
// 예전 방문자 브라우저에 남은 캐시 저장소도 비운다
if ('caches' in window) {
  caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {})
}

// ── lite-oc 글: 따로 띄우던 서비스가 상자 하나로 들어간다 ──
const EN = (document.documentElement.getAttribute('lang') || '').toLowerCase().startsWith('en')
const SERVICES = EN
  ? [
      'PostgreSQL', 'Mosquitto MQTT', 'S3 storage', 'SQS queue', 'nginx proxy', 'edge nginx',
      'Tailscale', 'Back office', 'Tablet screen', 'Session expiry job', 'CCTV relay',
      'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
    ]
  : [
      'PostgreSQL', 'Mosquitto MQTT', 'S3 저장소', 'SQS 큐', 'nginx 프록시', 'edge nginx',
      'Tailscale', '백오피스', '태블릿 화면', '세션 만료 작업', 'CCTV 중계',
      'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
    ]
const cloud = document.getElementById('cloud')
if (cloud) {
  const box = document.getElementById('box')
  const countEl = document.getElementById('count')
  const replay = document.getElementById('replay')
  const unitEl = box.querySelector('.count .unit')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const TOTAL = SERVICES.length + 1 // + Go 서버 자신
  const unit = (n) => (EN ? (n === 1 ? 'service' : 'services') : '개')

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
    if (EN && unitEl) unitEl.textContent = unit(1)
    box.classList.add('done')
    replay.disabled = false
  }

  function reset() {
    chips.forEach((c) => c.classList.remove('gone'))
    countEl.textContent = String(TOTAL)
    if (EN && unitEl) unitEl.textContent = unit(TOTAL)
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
          if (EN && unitEl) unitEl.textContent = unit(left)
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
      img.alt = tab.textContent + (EN ? ' screen' : ' 화면')
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
  img.setAttribute('aria-label', (img.alt || (EN ? 'Image' : '그림')) + (EN ? ', view larger' : ' 크게 보기'))
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
  // OS 가 다크 모드로 바뀌면 색을 다시 맞춰 그린다
  if (dark.addEventListener) dark.addEventListener('change', () => render())
  let resizeTimer = 0
  addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => diagrams.forEach((d) => fit(d.holder)), 150)
  }, { passive: true })
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
