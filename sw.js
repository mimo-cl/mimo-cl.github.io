// Mimo: guarda la app en el celular para que funcione sin internet.
const VERSION = 'mimo-v26';
const ARCHIVOS = ['./', './index.html', './reserva.html', './r.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png', './privacidad.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Páginas: primero internet (para recibir actualizaciones), si no hay, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const copia = r.clone(); caches.open(VERSION).then(c => c.put(req, copia)); return r;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Resto (íconos, librería del QR): primero la copia guardada.
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
    return res;
  })));
});

// Aviso diario de publicación aunque la app esté cerrada (si el teléfono lo permite).
self.addEventListener('periodicsync', e => {
  if (e.tag !== 'mimo-pub') return;
  e.waitUntil(caches.open('mimo-pub').then(c => c.match('./__pub').then(r => r && r.json().then(p => {
    const d = new Date(), pad = n => String(n).padStart(2, '0'), f = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const hs = (p.h || ['10:00']).map(x => { const [a, b] = String(x).split(':').map(Number); return a * 60 + (b || 0); });
    if (!p.on || (p.d || []).indexOf(d.getDay()) < 0 || p.hecha === f || p.avisada === f || d.getHours() * 60 + d.getMinutes() < Math.min(...hs)) return;
    p.avisada = f;
    return c.put('./__pub', new Response(JSON.stringify(p), { headers: { 'content-type': 'application/json' } })).then(() =>
      self.registration.showNotification('📣 Hoy toca publicar', { body: 'Tus historias del día ya están listas en Mimo. Toca para compartirlas.', icon: 'icon-192.png', badge: 'icon-192.png', tag: 'mimo-pub', data: { url: './#publicar' } }));
  }))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) { if ('focus' in w) { w.navigate && e.notification.tag === 'mimo-pub' ? w.navigate(url).catch(() => {}) : null; return w.focus(); } }
    return clients.openWindow(url);
  }));
});
