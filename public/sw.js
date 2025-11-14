const CACHE_NAME = 'monitor-ip-v1';
const NOTIFICATION_TAG_PREFIX = 'device-status-';
const SUMMARY_TAG = 'device-summary';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});

self.addEventListener('push', (event) => {
  try {
    const data = event.data.json();
    const notificationOptions = {
      icon: '/notification-icon.svg',
      badge: '/notification-badge.svg',
      tag: data.tag || NOTIFICATION_TAG_PREFIX + data.deviceId,
      requireInteraction: false,
      vibrate: [100, 50, 100],
      silent: false,
      data: {
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        status: data.status,
        timestamp: data.timestamp,
      },
    };

    if (data.summary) {
      notificationOptions.tag = SUMMARY_TAG;
      notificationOptions.title = 'Cambios de Estado de Dispositivos';
      notificationOptions.body = data.message;
    } else {
      notificationOptions.title = data.deviceName;
      notificationOptions.body = data.message;
    }

    event.waitUntil(
      self.registration.showNotification(
        notificationOptions.title,
        notificationOptions
      )
    );
  } catch (error) {
    console.error('Error handling push notification:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
