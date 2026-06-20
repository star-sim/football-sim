// ⚽ 축구 시뮬레이션 Service Worker — v6.21
// 전략: Cache First (게임 파일) + Network First (없을 때 캐시)

const CACHE_NAME = 'fsim-v6-21';
const ASSETS = [
  './football_sim_v6_21_pwa.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // 아이콘 없어도 실패 안 되게 개별 처리
      return cache.addAll(['./football_sim_v6_21_pwa.html', './manifest.json'])
        .then(function() {
          return Promise.allSettled(
            ['./icon-192.png', './icon-512.png'].map(function(url) {
              return cache.add(url).catch(function() {});
            })
          );
        });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 패치: Cache First 전략
self.addEventListener('fetch', function(e) {
  // POST 등 캐시 불가 요청은 그냥 통과
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      // 캐시 없으면 네트워크 → 성공 시 캐시에 저장
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, toCache);
        });
        return response;
      }).catch(function() {
        // 오프라인이고 캐시도 없으면 기본 응답
        return new Response('오프라인 상태입니다. 한 번 이상 온라인에서 접속 후 사용하세요.', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      });
    })
  );
});
