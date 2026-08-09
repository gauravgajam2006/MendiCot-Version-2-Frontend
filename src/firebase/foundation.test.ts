import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const messaging = readFileSync(new URL('./messaging.ts', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('./serviceWorker.ts', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../../public/firebase-messaging-sw.js', import.meta.url), 'utf8');
const controls = readFileSync(new URL('../components/TurnAlertControls.tsx', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');

test('FCM setup checks support and supplies VAPID plus the explicit service-worker registration', () => {
  assert.match(messaging, /await isSupported\(\)/);
  assert.match(messaging, /getToken\(messaging, \{[\s\S]*vapidKey: config\.config\.vapidKey,[\s\S]*serviceWorkerRegistration: registration/);
  assert.match(messaging, /token \? \{ status: 'token_ready', token/);
  assert.doesNotMatch(messaging, /console\./);
  assert.match(messaging, /onMessage\(messaging/);
});

test('service worker uses the required root path once, awaits an activated worker, and preserves click behavior', () => {
  assert.match(serviceWorker, /FIREBASE_MESSAGING_SERVICE_WORKER_PATH = '\/firebase-messaging-sw\.js'/);
  assert.match(serviceWorker, /register\(FIREBASE_MESSAGING_SERVICE_WORKER_PATH, \{ scope: '\/' \}\)/);
  assert.match(serviceWorker, /await installed\.update\(\)\.catch/);
  assert.match(serviceWorker, /await navigator\.serviceWorker\.ready/);
  assert.match(serviceWorker, /ready\.scope !== installed\.scope/);
  assert.match(serviceWorker, /ready\.active\?\.state !== 'activated'/);
  assert.match(serviceWorker, /if \(!registrationPromise\)/);
  assert.match(worker, /preferred \? preferred\.focus\(\) : self\.clients\.openWindow\('\/'\)/);
  assert.match(worker, /Your turn in MendiCot/);
});

test('worker gets startup config from a generated static artifact and safely initializes background messaging', () => {
  assert.match(viteConfig, /createFirebaseWorkerConfigArtifact/);
  assert.match(viteConfig, /fileName: FIREBASE_WORKER_CONFIG_PATH\.slice\(1\)/);
  assert.match(worker, /importScripts\('\/firebase-messaging-sw-config\.js'\)/);
  assert.match(worker, /firebase\.initializeApp\(config\)/);
  assert.match(worker, /messaging\.onBackgroundMessage/);
  assert.doesNotMatch(worker, /type: 'MENDICOT_FIREBASE_CONFIG'|postMessage/);
});

test('background display has one manual path, exact copy, and a duplicate guard for notification payloads', () => {
  assert.equal((worker.match(/showNotification\(/g) ?? []).length, 1);
  assert.match(worker, /if \(payload\?\.notification\) return/);
  assert.match(worker, /showNotification\('MendiCot', \{[\s\S]*body: 'Your turn in MendiCot'/);
  assert.match(messaging, /onMessage\(messaging, \(\) => \{ \/\* Phase 2 owns visible-page alerts\. \*\//);
});

test('click behavior is registered before Firebase and focuses same-origin clients or opens root', () => {
  assert.ok(worker.indexOf("addEventListener('notificationclick'") < worker.indexOf("firebase-app-compat.js"));
  assert.match(worker, /new URL\(client\.url\)\.origin === self\.location\.origin/);
  assert.match(worker, /preferred \? preferred\.focus\(\) : self\.clients\.openWindow\('\/'\)/);
});

test('normal settings expose no direct-display diagnostic while worker logging stays non-sensitive', () => {
  assert.doesNotMatch(serviceWorker, /showNotification|BrowserNotificationDiagnostic/);
  assert.doesNotMatch(controls, /Test Browser Notification|Browser notification diagnostic/);
  assert.doesNotMatch(worker, /console\.(?:info|log)\([^)]*(?:payload|config|token|vapid|session)/i);
});

test('permission is requested only from the explicit Enable action and notifies app registration', () => {
  assert.match(controls, />Enable Notifications<\/Button>/);
  assert.match(controls, /await requestNotificationPermission\(\)/);
  assert.match(controls, /onPermissionChanged\?\.\(\)/);
  assert.equal((controls.match(/requestNotificationPermission\(\)/g) ?? []).length, 1);
});

test('safe setup failures distinguish configuration, support, service worker, and token stages', () => {
  for (const status of ['firebase_not_configured', 'messaging_unsupported', 'service_worker_failed', 'token_failed']) {
    assert.match(messaging, new RegExp(`status: '${status}'`));
  }
});
