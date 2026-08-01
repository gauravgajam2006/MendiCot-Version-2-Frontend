import assert from 'node:assert/strict';
import test from 'node:test';
import {
  INITIAL_RESTORATION_STATE,
  isRestorationNoticeState,
  restorationStateForCode,
  restorationStateForStartup,
} from './restorationState.ts';

test('automatic restoration starts on a stable validation screen without an idle-page blink', () => {
  assert.equal(INITIAL_RESTORATION_STATE, 'validating-session');
  assert.equal(restorationStateForStartup('resume'), 'validating-session');
  assert.notEqual(restorationStateForStartup('resume'), 'idle');
  assert.notEqual(restorationStateForStartup('resume'), 'resume-selection');
});

test('startup and machine-readable rejection codes map to deterministic states', () => {
  assert.equal(restorationStateForStartup('choose'), 'resume-selection');
  assert.equal(restorationStateForStartup('none'), 'idle');
  assert.equal(restorationStateForCode('SESSION_EXPIRED'), 'session-expired');
  assert.equal(restorationStateForCode('ROOM_NOT_FOUND'), 'room-closed');
  assert.equal(restorationStateForCode('INVALID_SESSION'), 'session-invalid');
  assert.equal(isRestorationNoticeState('backend-unavailable'), false);
});
