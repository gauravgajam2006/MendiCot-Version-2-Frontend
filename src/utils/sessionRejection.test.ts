import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySessionClose, isCurrentSessionSocket, isExplicitSessionRejectionMessage } from './sessionRejection.ts';
import { getRoomSession, saveRoomSession } from './roomSession.ts';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('invalid token, expired player and deleted-room messages are explicit rejections', () => {
  assert.equal(isExplicitSessionRejectionMessage({ type: 'ERROR', payload: { detail: 'Invalid token' } }), true);
  assert.equal(isExplicitSessionRejectionMessage({ type: 'PLAYER_NOT_FOUND' }), true);
  assert.equal(isExplicitSessionRejectionMessage({ type: 'ERROR', payload: { error: { message: 'Room was deleted' } } }), true);
  assert.equal(isExplicitSessionRejectionMessage({ type: 'ERROR', payload: { detail: 'Not found' } }), true);
  assert.equal(isExplicitSessionRejectionMessage({ type: 'SESSION_EXPIRED' }), true);
});

test('explicit rejection closes are terminal and cannot enter the reconnect path', () => {
  assert.equal(classifySessionClose(1008, 'Invalid session'), 'expire-session');
  assert.equal(classifySessionClose(4404, ''), 'expire-session');
  assert.equal(classifySessionClose(1000, 'player not found'), 'expire-session');
});

test('temporary backend and network failures retry without deleting the saved session', () => {
  const local = new MemoryStorage();
  const sessionKey = saveRoomSession({
    roomId: '12D52462',
    playerId: 'jd-id',
    sessionToken: 'jd-token',
    displayName: 'JD',
    updatedAt: 1,
  }, local)!;

  assert.equal(classifySessionClose(1006, ''), 'retry');
  assert.equal(classifySessionClose(1011, 'Backend temporarily unavailable'), 'retry');
  assert.equal(isExplicitSessionRejectionMessage({ type: 'ERROR', payload: { detail: 'Service unavailable' } }), false);
  assert.equal(getRoomSession(sessionKey, local)?.playerId, 'jd-id');
});

test('stale socket identities cannot replace an expired-session result', () => {
  const expiredAttempt = { generation: 3, sessionKey: 'room:ag', playerId: 'ag-id' };
  assert.equal(isCurrentSessionSocket(expiredAttempt, expiredAttempt), true);
  assert.equal(isCurrentSessionSocket(expiredAttempt, { generation: 4, sessionKey: null, playerId: 'p1' }), false);
  assert.equal(isCurrentSessionSocket(expiredAttempt, { generation: 4, sessionKey: 'room:jd', playerId: 'jd-id' }), false);
});
