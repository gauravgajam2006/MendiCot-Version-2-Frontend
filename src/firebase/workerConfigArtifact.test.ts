import assert from 'node:assert/strict';
import test from 'node:test';
import { createFirebaseWorkerConfigArtifact } from './workerConfigArtifact.ts';

test('worker artifact contains only required public Firebase messaging configuration', () => {
  const source = createFirebaseWorkerConfigArtifact({
    VITE_FIREBASE_API_KEY: ' api-key ',
    VITE_FIREBASE_PROJECT_ID: 'project-id',
    VITE_FIREBASE_MESSAGING_SENDER_ID: 'sender-id',
    VITE_FIREBASE_APP_ID: 'app-id',
  }, false);
  assert.match(source, /"apiKey":"api-key"/);
  assert.match(source, /"projectId":"project-id"/);
  assert.match(source, /"messagingSenderId":"sender-id"/);
  assert.match(source, /"appId":"app-id"/);
  assert.doesNotMatch(source, /VAPID|SERVICE_ACCOUNT|PRIVATE_KEY|SESSION/i);
  assert.match(source, /__MENDICOT_DEV__ = false/);
});
