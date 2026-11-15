// 옛 PWA 서비스 워커를 지운다. 예전 방문자의 브라우저에 남은 캐시와 등록을 없앤다.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  )
})
