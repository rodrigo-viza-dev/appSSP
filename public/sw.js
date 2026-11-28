// PrácticasCC · service worker de notificaciones push (web). Solo muestra avisos; no guarda datos en caché.
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/';
  event.waitUntil(self.registration.showNotification(data.title || 'PrácticasCC', {
    body: data.body || 'Tienes un aviso nuevo.', icon: '/favicon.ico', badge: '/favicon.ico', data: { url }, tag: url,
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const open = clients.find(c => c.url.startsWith(self.location.origin));
    if (open) { open.navigate(url); return open.focus(); }
    return self.clients.openWindow(url);
  }));
});
