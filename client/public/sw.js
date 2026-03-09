self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'You have a new notification.' };
  }

  const title = data.title || 'M5 CRM Notification';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/logo.webp',
    badge: '/logo.webp',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    actions: [{ action: 'open', title: 'Open App' }]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    for (let i = 0; i < windowClients.length; i++) {
      const windowClient = windowClients[i];
      if (windowClient.url === urlToOpen) {
        return windowClient.focus();
      }
    }
    return clients.openWindow(urlToOpen);
  });

  event.waitUntil(promiseChain);
});
