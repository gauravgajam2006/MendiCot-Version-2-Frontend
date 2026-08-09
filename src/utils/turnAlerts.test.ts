import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_TURN_ALERT_PREFERENCES, getTurnAlertPreferences, getTurnAlertStorageKey, isTurnAlertStorageEventForScope, parseTurnAlertPreferences, setTurnAlertPreferences, TURN_ALERT_SOUNDS } from './turnAlerts.ts';

function storage(): Storage {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); }, clear: () => values.clear(), key: () => null, get length() { return values.size; } } as Storage;
}

test('turn alerts default to enabled with Soft Chime', () => {
  assert.deepEqual(getTurnAlertPreferences(storage()), DEFAULT_TURN_ALERT_PREFERENCES);
  assert.deepEqual(TURN_ALERT_SOUNDS, [{ id: 'soft-chime', label: 'Soft Chime' }, { id: 'wooden-click', label: 'Wooden Click' }, { id: 'subtle-bell', label: 'Subtle Bell' }]);
});

test('turn alert preferences persist and malformed values recover safely', () => {
  const target = storage();
  setTurnAlertPreferences({ enabled: false, sound: 'subtle-bell' }, target, 'player-one');
  assert.deepEqual(getTurnAlertPreferences(target, 'player-one'), { enabled: false, sound: 'subtle-bell' });
  assert.deepEqual(parseTurnAlertPreferences('{bad json'), DEFAULT_TURN_ALERT_PREFERENCES);
  assert.deepEqual(parseTurnAlertPreferences('{"enabled":true,"sound":"unknown"}'), DEFAULT_TURN_ALERT_PREFERENCES);
});

test('player preference scopes remain isolated across refreshes and sounds', () => {
  const target = storage();
  setTurnAlertPreferences({ enabled: true, sound: 'soft-chime' }, target, 'player-one');
  setTurnAlertPreferences({ enabled: false, sound: 'wooden-click' }, target, 'player-two');
  assert.deepEqual(getTurnAlertPreferences(target, 'player-one'), { enabled: true, sound: 'soft-chime' });
  assert.deepEqual(getTurnAlertPreferences(target, 'player-two'), { enabled: false, sound: 'wooden-click' });
  assert.equal(isTurnAlertStorageEventForScope({ key: getTurnAlertStorageKey('player-two') }, 'player-one'), false);
  assert.equal(isTurnAlertStorageEventForScope({ key: getTurnAlertStorageKey('player-one') }, 'player-one'), true);
});

test('malformed data is contained to its own preference scope', () => {
  const target = storage();
  setTurnAlertPreferences({ enabled: false, sound: 'subtle-bell' }, target, 'player-two');
  target.setItem(getTurnAlertStorageKey('player-one'), '{bad json');
  assert.deepEqual(getTurnAlertPreferences(target, 'player-one'), DEFAULT_TURN_ALERT_PREFERENCES);
  assert.deepEqual(getTurnAlertPreferences(target, 'player-two'), { enabled: false, sound: 'subtle-bell' });
});