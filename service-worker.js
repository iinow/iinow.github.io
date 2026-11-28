// 옛 서비스 워커 자리. 새 워커는 /sw.js 이고, 이 파일은 예전 방문자의 등록만 스스로 정리한다.
// (새 캐시 `iinow-*` 는 건드리지 않는다.)
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith('iinow-')).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  )
})
