/**
 * sw.js — JS PROMPT Service Worker
 * Network-first for Pyodide CDN; cache-first for local assets.
 */

const CACHE_NAME = 'js-prompt-v108.1.1';

const PRECACHE = [
  './index.html',
  './pp.html',                  // privacy policy — NOT the help page
  './prompt_help.html',         // Help modal (footer link)
  './admin_help.html',          // Help modal (admin sidebar)
  './manifest.json',
  './css/index.css',
  './css/css-spinner.css',
  './css/prompt_help.css',
  './css/admin.css',
  './js/python_core.js',
  './js/prompt.js',
  './js/language.js',
  './js/spinner.js',
  './png/js-promt-192x192.png',
  './png/js-promt-512x512.png',
  './png/js-promt-152x152.png',
  './png/js-promt-32x32.png',
  './img/labeling/Symbol_Manufacturer.png',
  './img/labeling/Symbol_Date_Manufacture.png',
  './img/labeling/ifu.png',
  './img/labeling/waste.png',
  './img/labeling/md.png',
  './img/labeling/info_web.png',
  './img/labeling/Copyright.png',
  './fonts/Play-Regular.woff2',
  './fonts/Play-Bold.woff2',
  './png/js-promt-16x16.png',
];

/* ── Install: pre-cache local assets ──
   addAll() is all-or-nothing: one 404 silently kills the whole precache.
   Cache each entry independently so a single missing asset can't do that. */
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    ).catch(() => {})
  );
});

/* ── Activate: purge old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignore non-http(s) requests (chrome-extension://, etc.) — Cache API can't store them
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Pyodide CDN — network-first, fall back to cache
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // API calls — never cache, always network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Navigation requests (including <iframe> loads) — network-first, then the
  // EXACT cached page, then the app shell. Never force index.html on every
  // navigation, or sub-pages like prompt_help.html load the whole app inside
  // themselves. ignoreSearch is required: the Help iframe requests
  // "prompt_help.html?lang=uk", but the cache holds it without the query.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request, { ignoreSearch: true })
          .then(c => c || caches.match('./index.html'))
          // Guarantee a real Response — never resolve with undefined, which
          // surfaces as "FetchEvent … resulted in a network error response".
          .then(c => c || new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
            '<body style="font-family:sans-serif;padding:2rem">Offline — please reconnect and reload.',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          ))
      )
    );
    return;
  }

  // Local assets — cache-first with a safe network fallback (never rejects)
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return res;
        }).catch(() => Response.error());
      })
    );
  }
});

/* ── Push notifications ── */
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'JS PROMPT', body: (event.data && event.data.text()) || '' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'JS PROMPT', {
      body:  data.body || '',
      icon:  './png/js-promt-192x192.png',
      badge: './png/js-promt-32x32.png',
      tag:   data.jobId || 'js-prompt-job',
      data:  { url: data.url || './' },
    })
  );
});

/* ── Notification click: focus or open the app ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});