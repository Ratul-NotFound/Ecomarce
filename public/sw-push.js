// public/sw-push.js — Service Worker push handlers (no ESM, no node_modules)
const ICON  = '/icons/icon-192.png';
const BADGE = '/icons/badge-72.png';

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: 'Notification', body: event.data.text(), url: '/', tag: 'notification', vibrate: [200,100,200], actions: [] }; }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Notification', {
      body:               payload.body    ?? '',
      icon:               payload.icon    ?? ICON,
      badge:              payload.badge   ?? BADGE,
      tag:                payload.tag     ?? 'shopbd-notification',
      vibrate:            payload.vibrate ?? [200, 100, 200],
      data:               { url: payload.url ?? '/' },
      actions:            payload.actions ?? [],
      requireInteraction: false,
      silent:             false,
      renotify:           true,
      timestamp:          Date.now(),
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const win of wins) {
        if (win.url.includes(self.location.origin) && 'focus' in win) {
          win.focus();
          win.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('notificationclose', (_event) => { /* analytics hook */ });

self.addEventListener('pushsubscriptionchange', (event) => {
  const vapidKey = self.__VAPID_PUBLIC_KEY__;
  if (!vapidKey) return;
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    }).then(newSub => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
        wins.forEach(w => w.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: newSub.toJSON() }));
      });
    }).catch(err => {
      console.error('[sw-push] Re-subscribe failed:', err);
    })
  );
});
