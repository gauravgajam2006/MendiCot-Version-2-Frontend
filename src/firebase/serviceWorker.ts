export const FIREBASE_MESSAGING_SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

async function registerReadyServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const installed = await navigator.serviceWorker.register(FIREBASE_MESSAGING_SERVICE_WORKER_PATH, { scope: '/' });
    if (import.meta.env.DEV) await installed.update().catch(() => undefined);
    const ready = installed.active?.state === 'activated' ? installed : await navigator.serviceWorker.ready;
    const expectedScope = new URL('/', window.location.href).href;
    if (ready.scope !== installed.scope || ready.scope !== expectedScope || ready.active?.state !== 'activated') return null;
    return ready;
  } catch {
    return null;
  }
}

export function registerFirebaseMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!registrationPromise) registrationPromise = registerReadyServiceWorker();
  return registrationPromise;
}

export function resetFirebaseMessagingServiceWorkerForTests(): void { registrationPromise = null; }
