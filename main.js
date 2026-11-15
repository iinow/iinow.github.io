// 옛 PWA 서비스 워커 정리
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {})
}

// ── 히어로: 따로 띄우던 서비스가 상자 하나로 들어간다 ──
const SERVICES = [
  'PostgreSQL', 'Mosquitto MQTT', 'S3 저장소', 'SQS 큐', 'nginx 프록시', 'edge nginx',
  'Tailscale', '백오피스', '태블릿 화면', '세션 만료 작업', 'CCTV 중계',
  'Jaeger', 'Prometheus', 'Grafana', 'Loki', 'Alloy', 'Dozzle',
]
const cloud = document.getElementById('cloud')
if (cloud) {
  const box = document.getElementById('box')
  const countEl = document.getElementById('count')
  const replay = document.getElementById('replay')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const TOTAL = SERVICES.length + 1 // + Go 서버 자신

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
    box.classList.add('done')
    replay.disabled = false
  }

  function reset() {
    chips.forEach((c) => c.classList.remove('gone'))
    countEl.textContent = String(TOTAL)
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
  if (document.readyState === 'complete') play()
  else addEventListener('load', play)
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
      img.alt = tab.textContent + ' 화면'
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
  img.setAttribute('aria-label', (img.alt || '그림') + ' 크게 보기')
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

// ── 왼쪽 메뉴 ──
const drawer = document.getElementById('drawer')
const burger = document.getElementById('burger')
if (drawer && burger) {
  burger.addEventListener('click', () => drawer.showModal())
  drawer.addEventListener('click', (e) => {
    // 바깥(배경)을 누르거나 메뉴 안 링크를 누르면 닫는다
    if (e.target === drawer || e.target.closest('a')) drawer.close()
  })
}
