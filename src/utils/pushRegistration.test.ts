import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PushRegistrationCoordinator } from './pushRegistration.ts';

function connection(value: PushRegistrationCoordinator, generation = 1, accepts = true) {
  const sent: unknown[] = [];
  value.setConnection({
    generation,
    send: (message) => {
      sent.push(message);
      return accepts;
    },
  });
  return sent;
}

test('permission granted, token ready, and session ready sends REGISTER_PUSH exactly once', () => {
  const value = new PushRegistrationCoordinator();
  value.setEnabled(true);
  const sent = connection(value);
  value.setToken('token-a');
  value.setToken('token-a');
  assert.deepEqual(sent, [{ action: 'REGISTER_PUSH', payload: { registration_id: 'token-a', enabled: true } }]);
  assert.equal(value.currentStatus, 'registering');
  assert.equal(value.hasRegistration, false);
  value.handleServerMessage({ type: 'ACTION_SUCCESS' });
  assert.equal(value.currentStatus, 'registered');
  assert.equal(value.hasRegistration, true);
});

test('token ready before the authoritative session registers when the session arrives', () => {
  const value = new PushRegistrationCoordinator();
  value.setEnabled(true);
  value.setToken('token-first');
  assert.equal(value.currentStatus, 'waiting_for_session');
  const sent = connection(value);
  assert.equal(sent.length, 1);
});

test('authoritative session ready before token registers when the token arrives', () => {
  const value = new PushRegistrationCoordinator();
  value.setEnabled(true);
  const sent = connection(value);
  assert.equal(sent.length, 0);
  value.setToken('session-first');
  assert.equal(sent.length, 1);
});

test('service-worker and getToken failures remain safe and never register', () => {
  for (const status of ['service_worker_failed', 'token_failed'] as const) {
    const value = new PushRegistrationCoordinator();
    value.setEnabled(true);
    const sent = connection(value);
    value.setSetupFailure(status);
    assert.equal(value.currentStatus, status);
    assert.deepEqual(sent, []);
  }
});

test('failed send is not locally deduped and can retry the exact payload', () => {
  const sent: unknown[] = [];
  let accepts = false;
  const value = new PushRegistrationCoordinator();
  value.setEnabled(true);
  value.setConnection({ generation: 1, send: (message) => { sent.push(message); return accepts; } });
  value.setToken('retry-token');
  assert.equal(value.currentStatus, 'registration_failed');
  accepts = true;
  assert.equal(value.retry(), true);
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[1], { action: 'REGISTER_PUSH', payload: { registration_id: 'retry-token', enabled: true } });
});

test('a missing acknowledgement retries once, then remains failed without spamming', () => {
  const value = new PushRegistrationCoordinator();
  value.setEnabled(true);
  const sent = connection(value);
  value.setToken('timeout-token');
  assert.equal(value.registrationTimedOut(), true);
  assert.equal(sent.length, 2);
  assert.equal(value.registrationTimedOut(), false);
  assert.equal(value.currentStatus, 'registration_failed');
  assert.equal(sent.length, 2);
});

test('reconnect re-establishes an acknowledged registration for the new generation', () => {
  const value = new PushRegistrationCoordinator();
  value.setEnabled(true);
  const sent = connection(value);
  value.setToken('same-token');
  value.handleServerMessage({ type: 'ACTION_SUCCESS', payload: { action: 'REGISTER_PUSH' } });
  value.setConnection({ generation: 2, send: (message) => { sent.push(message); return true; } });
  assert.equal(sent.filter((message) => (message as { action: string }).action === 'REGISTER_PUSH').length, 2);
  assert.equal(value.currentStatus, 'registering');
});

test('safe diagnostics never log raw registration, VAPID, config, or session values', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const diagnostics = app.split('\n').filter((line) => line.includes('console.info')).join('\n');
  assert.doesNotMatch(diagnostics, /result\.token|vapidKey|sessionToken|firebase\.config/i);
});
