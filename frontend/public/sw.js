// INUKA service worker (spec §19.4: installable app + offline reading).
//   • Pages: network first; when offline, the saved app shell is used.
//   • Built files (JS/CSS/fonts/images): cache first (their names change with every release).
//   • Lessons and courses already opened: network first, the saved copy when offline — so students can
//     re-read lessons without internet. Only these read-only GET requests are saved:
//     /api/lessons/:id, /api/courses, /api/courses/:slug, /api/public/courses, /api/public/scholarships…
//   • Never saved: sign-in, account, documents, AI chat, admin, anything that is not GET.
// Sign-out clears the saved lessons (the app sends { type: 'clear-user-cache' }).
const VERSION = 'inuka-v2';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const DATA = `${VERSION}-data`;     // the signed-in student's lessons and courses (cleared at sign-out)
const PUBLIC = `${VERSION}-public`; // public lists (courses, scholarships, home page)
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png', '/icon-192.png', '/brand/inuka-logo.png', '/brand/inuka-mark.png'];
const USER_API = [/^\/api\/lessons\/[\w-]+$/, /^\/api\/courses(\/[\w-]+)?$/];
const PUBLIC_API = [/^\/api\/public\/(courses|scholarships|landing|posts)(\/[\w-]+)?$/];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => {
  if (e.data?.type === 'clear-user-cache') e.waitUntil(caches.delete(DATA));
});

async function networkFirst(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) { cache.put(req, res.clone()); return res; }
    if (res.status >= 500) throw new Error('server unavailable'); // server down: use the saved copy if there is one
    return res;
  } catch {
    return (await cache.match(req)) || (fallbackUrl && (await caches.match(fallbackUrl))) || new Response(
      JSON.stringify({ error: 'You are offline. This page has not been saved on this device yet.' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }
}
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) (await caches.open(ASSETS)).put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // photos from other sites, Google sign-in, etc.
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, SHELL, '/index.html')); return; }
  if (url.pathname.startsWith('/api/')) {
    if (USER_API.some((re) => re.test(url.pathname))) e.respondWith(networkFirst(req, DATA));
    else if (PUBLIC_API.some((re) => re.test(url.pathname))) e.respondWith(networkFirst(req, PUBLIC));
    return; // every other API call goes straight to the network
  }
  if (/^\/(assets|brand|partners)\/|\.(png|jpg|jpeg|webp|svg|woff2?|css|js)$/.test(url.pathname)) e.respondWith(cacheFirst(req));
});
