import assert from 'node:assert/strict';
import test from 'node:test';
import { readFirebaseConfig } from './config.ts';

const complete = {
  VITE_FIREBASE_API_KEY: ' key ', VITE_FIREBASE_AUTH_DOMAIN: ' auth ', VITE_FIREBASE_PROJECT_ID: ' project ',
  VITE_FIREBASE_STORAGE_BUCKET: ' bucket ', VITE_FIREBASE_MESSAGING_SENDER_ID: ' sender ', VITE_FIREBASE_APP_ID: ' app ', VITE_FIREBASE_VAPID_KEY: ' vapid ',
};
test('Firebase config accepts all required values and does not require measurementId', () => {
  const result = readFirebaseConfig(complete);
  assert.equal(result.status, 'configured');
  if (result.status === 'configured') { assert.equal(result.config.firebase.apiKey, 'key'); assert.equal(result.config.vapidKey, 'vapid'); assert.equal('measurementId' in result.config.firebase, false); }
});
test('missing Firebase configuration is safely unavailable', () => {
  const result = readFirebaseConfig({ ...complete, VITE_FIREBASE_VAPID_KEY: '  ' });
  assert.deepEqual(result, { status: 'unavailable', missing: ['VITE_FIREBASE_VAPID_KEY'] });
});
