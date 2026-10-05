const CACHE = 'auto-card-v7';
const ASSETS = ['./', './index.html', './merchant.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선: 온라인이면 항상 최신 파일을 받아 캐시를 갱신하고, 오프라인이면 캐시로 동작한다.
// (그래서 앱을 고쳐 배포해도 캐시 버전을 올릴 필요 없이 다음 실행 때 자동 반영된다)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 다른 출처(Firebase SDK·Firestore·구글 로그인)는 서비스워커가 건드리지 않는다
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(hit =>
      hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
