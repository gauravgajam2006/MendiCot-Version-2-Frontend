self.importScripts('/firebase-messaging-sw-config.js');

const development = self.__MENDICOT_DEV__ === true;
const diagnostic = (message) => { if (development) console.info(`[Turn Alerts SW] ${message}`); };

self.addEventListener('install', (event) => {
  diagnostic('installed');
  if (development) event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  diagnostic('activated');
  if (development) event.waitUntil(self.clients.claim());
});

/* Register custom click behavior before Firebase Messaging installs its handler. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.stopImmediatePropagation();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const sameOrigin = windows.filter((client) => new URL(client.url).origin === self.location.origin);
    const preferred = sameOrigin.find((client) => client.visibilityState === 'visible') || sameOrigin[0];
    return preferred ? preferred.focus() : self.clients.openWindow('/');
  }));
});

try {
  const config = self.__MENDICOT_FIREBASE_CONFIG__;
  if (!config?.apiKey || !config?.projectId || !config?.appId || !config?.messagingSenderId) {
    throw new Error('Firebase web configuration is incomplete');
  }
  /* Compat versions intentionally match the installed Firebase package. */
  self.importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
  self.importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    diagnostic('background message received');
    /* Notification payloads are rendered by FCM; the expected backend contract is data-only. */
    if (payload?.notification) return;
    return self.registration.showNotification('MendiCot', {
      body: 'Your turn in MendiCot',
      tag: 'mendicot-turn',
    }).then(() => diagnostic('notification displayed')).catch(() => diagnostic('notification display failed'));
  });
  diagnostic('initialized');
} catch (_) {
  diagnostic('initialization failed');
}
