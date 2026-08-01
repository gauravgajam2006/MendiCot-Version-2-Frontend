import assert from 'node:assert/strict';
import test from 'node:test';
import {
  claimTabSession,
  clearActiveTabSession,
  finalizeRejectedRoomSession,
  finalizeValidatedRejectedRoomSession,
  getActiveTabSession,
  getAllRoomSessions,
  getRoomSession,
  getSessionStartupDecision,
  migrateLegacySingletonSession,
  releaseTabSession,
  removeRoomSession,
  saveRoomSession,
  setActiveTabSession,
  updateRoomSessionIdentity,
} from './roomSession.ts';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const jd = { roomId: '12d52462', playerId: 'jd-id', sessionToken: 'jd-token', displayName: 'JD', updatedAt: 1 };
const vp = { roomId: '12D52462', playerId: 'vp-id', sessionToken: 'vp-token', displayName: 'VP', updatedAt: 2 };

test('two tabs keep different active identities and a later join does not overwrite either tab', () => {
  const local = new MemoryStorage();
  const jdTab = new MemoryStorage();
  const vpTab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  setActiveTabSession(jdKey, jdTab);
  const vpKey = saveRoomSession(vp, local)!;
  setActiveTabSession(vpKey, vpTab);

  assert.equal(getActiveTabSession(jdTab), jdKey);
  assert.equal(getActiveTabSession(vpTab), vpKey);
  assert.equal(getAllRoomSessions(local)[jdKey].playerId, 'jd-id');
  assert.equal(getAllRoomSessions(local)[vpKey].playerId, 'vp-id');
});

test('refresh restores the active tab session, not the most recently saved player', () => {
  const local = new MemoryStorage();
  const jdTab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  setActiveTabSession(jdKey, jdTab);
  saveRoomSession(vp, local);

  const decision = getSessionStartupDecision(local, jdTab);
  assert.equal(decision.kind, 'resume');
  if (decision.kind === 'resume') assert.equal(decision.session.playerId, 'jd-id');
});

test('multiple sessions require selection while exactly one auto-resumes', () => {
  const local = new MemoryStorage();
  saveRoomSession(jd, local);
  saveRoomSession(vp, local);
  assert.equal(getSessionStartupDecision(local, new MemoryStorage()).kind, 'choose');

  const singleLocal = new MemoryStorage();
  const singleTab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, singleLocal)!;
  const decision = getSessionStartupDecision(singleLocal, singleTab);
  assert.equal(decision.kind, 'resume');
  assert.equal(getActiveTabSession(singleTab), null);
  if (decision.kind === 'resume') assert.equal(decision.sessionKey, jdKey);
});

test('leave or invalid-session cleanup removes only the targeted session', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  const vpKey = saveRoomSession(vp, local)!;
  setActiveTabSession(jdKey, tab);
  removeRoomSession(jdKey, local);
  clearActiveTabSession(jdKey, tab);

  assert.equal(getRoomSession(jdKey, local), null);
  assert.equal(getRoomSession(vpKey, local)?.playerId, 'vp-id');
  assert.equal(getActiveTabSession(tab), null);
});

test('same-session duplicate tabs are blocked but different players remain independent', () => {
  const local = new MemoryStorage();
  assert.equal(claimTabSession('room:jd', 'tab-a', false, local, 1_000), true);
  assert.equal(claimTabSession('room:jd', 'tab-b', false, local, 2_000), false);
  assert.equal(claimTabSession('room:vp', 'tab-b', false, local, 2_000), true);
  assert.equal(claimTabSession('room:jd', 'tab-b', true, local, 2_000), true);
  releaseTabSession('room:jd', 'tab-a', local);
  assert.equal(claimTabSession('room:jd', 'tab-c', false, local, 2_500), false);
});

test('legacy singleton keys migrate once into the registry and become active for this tab', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  local.setItem('mendicot.roomId', '12d52462');
  local.setItem('mendicot.playerId', 'legacy-id');
  local.setItem('mendicot.sessionToken', 'legacy-token');

  const migrated = migrateLegacySingletonSession(local, tab);
  assert.equal(migrated?.playerId, 'legacy-id');
  assert.ok(getActiveTabSession(tab));
  assert.equal(local.getItem('mendicot.playerId'), null);
  assert.equal(migrateLegacySingletonSession(local, tab), null);
});

test('malformed registry entries are ignored safely', () => {
  const local = new MemoryStorage();
  local.setItem('mendicot.sessions.v2', JSON.stringify({ bad: { roomId: 'ROOM' }, alsoBad: 'token' }));
  assert.deepEqual(getAllRoomSessions(local), {});
});

test('expired Resume removes only that session, clears the tab key and releases ownership', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  const vpKey = saveRoomSession(vp, local)!;
  setActiveTabSession(jdKey, tab);
  assert.equal(claimTabSession(jdKey, 'jd-tab', false, local, 1_000), true);

  const cleanup = finalizeRejectedRoomSession(jdKey, 'jd-tab', local, tab, 2_000);
  assert.equal(cleanup.removed, true);
  assert.equal(cleanup.destination, 'resume');
  assert.equal(getActiveTabSession(tab), null);
  assert.equal(getRoomSession(jdKey, local), null);
  assert.equal(getRoomSession(vpKey, local)?.displayName, 'VP');
  assert.deepEqual(Object.keys(cleanup.remainingSessions), [vpKey]);
  assert.equal(claimTabSession(jdKey, 'replacement-tab', false, local, 2_500), true);
});

test('expired Resume returns to landing when no saved sessions remain', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  setActiveTabSession(jdKey, tab);
  claimTabSession(jdKey, 'jd-tab', false, local, 1_000);

  const cleanup = finalizeRejectedRoomSession(jdKey, 'jd-tab', local, tab, 2_000);
  assert.equal(cleanup.destination, 'landing');
  assert.deepEqual(cleanup.remainingSessions, {});
});

test('rejected-session cleanup is idempotent for StrictMode or duplicate callbacks', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  setActiveTabSession(jdKey, tab);
  claimTabSession(jdKey, 'jd-tab', false, local, 1_000);

  assert.equal(finalizeRejectedRoomSession(jdKey, 'jd-tab', local, tab, 2_000).removed, true);
  assert.equal(finalizeRejectedRoomSession(jdKey, 'jd-tab', local, tab, 2_100).removed, false);
  assert.equal(getActiveTabSession(tab), null);
});

test('REST rejection removes the selected session and any lease while preserving other players', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  const vpKey = saveRoomSession(vp, local)!;
  setActiveTabSession(jdKey, tab);
  claimTabSession(jdKey, 'another-tab', false, local, 1_000);

  const cleanup = finalizeValidatedRejectedRoomSession(jdKey, local, tab, 2_000);
  assert.equal(cleanup.removed, true);
  assert.equal(cleanup.destination, 'resume');
  assert.equal(getActiveTabSession(tab), null);
  assert.equal(getRoomSession(jdKey, local), null);
  assert.equal(getRoomSession(vpKey, local)?.playerId, 'vp-id');
  assert.equal(claimTabSession(jdKey, 'new-tab', false, local, 2_500), true);
});

test('cleaned stale session cannot auto-resume and manual Join remains reachable', () => {
  const local = new MemoryStorage();
  const tab = new MemoryStorage();
  const jdKey = saveRoomSession(jd, local)!;
  setActiveTabSession(jdKey, tab);
  assert.equal(finalizeValidatedRejectedRoomSession(jdKey, local, tab, 2_000).destination, 'landing');
  assert.equal(getSessionStartupDecision(local, tab).kind, 'none');
  assert.equal(finalizeValidatedRejectedRoomSession(jdKey, local, tab, 2_100).removed, false);
});

test('canonical room ID from validation replaces the saved registry key and preserves credentials', () => {
  const local = new MemoryStorage();
  const oldKey = saveRoomSession({ ...jd, roomId: 'ALIAS001' }, local)!;
  const updated = updateRoomSessionIdentity(oldKey, { roomId: 'CANON001', displayName: 'JD Canonical' }, local);
  assert.equal(updated?.sessionKey, 'CANON001:jd-id');
  assert.equal(updated?.session.roomId, 'CANON001');
  assert.equal(updated?.session.sessionToken, 'jd-token');
  assert.equal(updated?.session.displayName, 'JD Canonical');
  assert.equal(getRoomSession(oldKey, local), null);
});
