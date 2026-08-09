import assert from 'node:assert/strict';
import test from 'node:test';
import { getBrowserNotificationStatus, requestNotificationPermission } from './messaging.ts';

test('browser notification capability stays available when Firebase configuration is missing', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, value: { permission: 'default', requestPermission: async () => 'granted' } });
  assert.equal(getBrowserNotificationStatus(), 'not-enabled');
  assert.equal(await requestNotificationPermission(), 'enabled');
  if (descriptor) Object.defineProperty(globalThis, 'Notification', descriptor); else Reflect.deleteProperty(globalThis, 'Notification');
  Reflect.deleteProperty(globalThis, 'window');
});
test('a genuinely missing Notification API is unsupported', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  Reflect.deleteProperty(globalThis, 'Notification');
  assert.equal(getBrowserNotificationStatus(), 'unsupported');
  if (descriptor) Object.defineProperty(globalThis, 'Notification', descriptor);
  Reflect.deleteProperty(globalThis, 'window');
});
