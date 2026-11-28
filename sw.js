// iinow 서비스 워커: 홈 화면 앱(PWA)과 오프라인 열람을 담당한다.
// - 페이지(HTML): 네트워크 우선 → 저장해 둔 사본 → 오프라인 안내 페이지
// - 정적 파일(CSS/JS/이미지): 저장해 둔 사본을 먼저 주고 뒤에서 최신으로 바꾼다(SWR)
// - 다른 도메인(GA4, giscus, 폰트 CDN)과 GET 이 아닌 요청은 가로채지 않는다.
// 캐시 이름을 바꾸면 새 캐시로 갈아타고 옛 캐시는 activate 에서 지운다.
const VERSION = 'v2';
const PRECACHE_CACHE = `iinow-precache-${VERSION}`;
const RUNTIME_CACHE = `iinow-runtime-${VERSION}`;
const KEEP = [PRECACHE_CACHE, RUNTIME_CACHE];

const OFFLINE_URL = '/offline.html';
const PRECACHE_URLS = [
  '/',
  '/en/',
  '/ja/',
  '/zh/',
  OFFLINE_URL,
  '/style.css',
  '/main.js',
  '/search.json',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/favicon.ico',
  '/img/icon-192x192.png',
  '/img/icon-512x512.png',
  '/img/icon-maskable-192x192.png',
  '/img/icon-maskable-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE_CACHE);
    // 한 파일이 실패해도 설치는 끝낸다(404 난 항목만 빠진다).
    await Promise.all(PRECACHE_URLS.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// 페이지 이동: 네트워크 우선. 실패하면 저장해 둔 사본, 그것도 없으면 오프라인 안내.
async function handleNavigate(event) {
  const request = event.request;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response('오프라인입니다. 연결을 확인해 주세요.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// 정적 파일: 저장해 둔 사본을 먼저 주고, 뒤에서 최신 사본으로 바꾼다.
async function handleAsset(event) {
  const request = event.request;
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const response = await network;
  return response || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 외부 도메인은 손대지 않는다
  if (url.pathname === '/sw.js') return;           // 서비스 워커 자신은 캐시하지 않는다
  if (request.headers.has('range')) return;        // 일부만 받는 요청은 그대로 보낸다

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigate(event));
  } else {
    event.respondWith(handleAsset(event));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
