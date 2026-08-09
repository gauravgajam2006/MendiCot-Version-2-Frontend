import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging';
import type { PushTokenSetupStatus } from '@/utils/pushRegistration';
import { readFirebaseConfig, type FirebaseClientConfig } from './config.ts';
import { registerFirebaseMessagingServiceWorker } from './serviceWorker.ts';

export type BrowserNotificationStatus = 'not-enabled' | 'enabled' | 'blocked' | 'unsupported' | 'error';
export type PushSetupStatus = PushTokenSetupStatus | 'token_ready';
export type RegistrationResult = { status: 'token_ready'; token: string; checkedAt: number } | { status: PushTokenSetupStatus };

let app: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;
let foregroundListenerRegistered = false;

function getFirebaseApp(config: FirebaseClientConfig): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(config.firebase);
  return app;
}

async function getSupportedMessagingClient(config: FirebaseClientConfig): Promise<Messaging | null> {
  if (!messagingPromise) {
    messagingPromise = Promise.resolve().then(() => getMessaging(getFirebaseApp(config))).catch(() => null);
  }
  const messaging = await messagingPromise;
  if (messaging && !foregroundListenerRegistered) {
    onMessage(messaging, () => { /* Phase 2 owns visible-page alerts. */ });
    foregroundListenerRegistered = true;
  }
  return messaging;
}

export async function getMessagingClient(): Promise<{ messaging: Messaging; config: FirebaseClientConfig } | null> {
  const config = readFirebaseConfig();
  if (config.status !== 'configured' || typeof window === 'undefined') return null;
  try {
    if (!await isSupported()) return null;
    const messaging = await getSupportedMessagingClient(config.config);
    return messaging ? { messaging, config: config.config } : null;
  } catch {
    return null;
  }
}

export function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'enabled';
  if (Notification.permission === 'denied') return 'blocked';
  return 'not-enabled';
}

export async function requestNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (getBrowserNotificationStatus() === 'unsupported') return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted' ? 'enabled' : permission === 'denied' ? 'blocked' : 'not-enabled';
  } catch {
    return 'error';
  }
}

export async function revalidateMessagingRegistration(turnAlertsEnabled: boolean): Promise<RegistrationResult> {
  if (!turnAlertsEnabled || getBrowserNotificationStatus() !== 'enabled') return { status: 'permission_not_granted' };
  const config = readFirebaseConfig();
  if (config.status !== 'configured') return { status: 'firebase_not_configured' };
  try {
    if (!await isSupported()) return { status: 'messaging_unsupported' };
  } catch {
    return { status: 'messaging_unsupported' };
  }
  const messaging = await getSupportedMessagingClient(config.config);
  if (!messaging) return { status: 'token_failed' };
  const registration = await registerFirebaseMessagingServiceWorker();
  if (!registration) return { status: 'service_worker_failed' };
  try {
    const token = await getToken(messaging, {
      vapidKey: config.config.vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token ? { status: 'token_ready', token, checkedAt: Date.now() } : { status: 'token_failed' };
  } catch {
    return { status: 'token_failed' };
  }
}

export function resetMessagingClientForTests(): void {
  app = null;
  messagingPromise = null;
  foregroundListenerRegistered = false;
}
