import { normalizeRoomCode } from './roomCode.ts';

export interface RoomSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
  displayName: string;
  updatedAt: number;
}

export type RoomSessionRegistry = Record<string, RoomSession>;
export type SessionStartupDecision =
  | { kind: 'none' }
  | { kind: 'resume'; sessionKey: string; session: RoomSession }
  | { kind: 'choose'; sessions: Array<{ sessionKey: string; session: RoomSession }> };

export interface RejectedSessionCleanupResult {
  removed: boolean;
  destination: 'resume' | 'landing';
  remainingSessions: RoomSessionRegistry;
}

const SESSIONS_KEY = 'mendicot.sessions.v2';
const ACTIVE_SESSION_KEY = 'mendicot.activeSessionKey';
const OWNERS_KEY = 'mendicot.sessionOwners.v1';
const OWNER_TTL_MS = 6_000;
const LEGACY_KEYS = {
  roomId: 'mendicot.roomId',
  playerId: 'mendicot.playerId',
  sessionToken: 'mendicot.sessionToken',
} as const;

interface SessionOwner { tabId: string; updatedAt: number }
type SessionOwnerRegistry = Record<string, SessionOwner>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function makeRoomSessionKey(roomId: string, playerId: string): string {
  return `${normalizeRoomCode(roomId)}:${playerId.trim()}`;
}

function parseRoomSession(value: unknown, expectedKey?: string): RoomSession | null {
  if (!isRecord(value)
    || !isNonEmptyString(value.roomId)
    || !isNonEmptyString(value.playerId)
    || !isNonEmptyString(value.sessionToken)
    || !isNonEmptyString(value.displayName)
    || typeof value.updatedAt !== 'number'
    || !Number.isFinite(value.updatedAt)
    || value.updatedAt <= 0) return null;

  const session: RoomSession = {
    roomId: normalizeRoomCode(value.roomId),
    playerId: value.playerId.trim(),
    sessionToken: value.sessionToken,
    displayName: value.displayName.trim(),
    updatedAt: value.updatedAt,
  };
  if (!session.roomId || (expectedKey && makeRoomSessionKey(session.roomId, session.playerId) !== expectedKey)) return null;
  return session;
}

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as unknown;
  } catch { return null; }
}

function writeJson(storage: Storage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}

export function getAllRoomSessions(storage: Storage = localStorage): RoomSessionRegistry {
  const parsed = readJson(storage, SESSIONS_KEY);
  if (!isRecord(parsed)) return {};
  const sessions: RoomSessionRegistry = {};
  for (const [sessionKey, value] of Object.entries(parsed)) {
    const session = parseRoomSession(value, sessionKey);
    if (session) sessions[sessionKey] = session;
  }
  return sessions;
}

export function getRoomSession(sessionKey: string, storage: Storage = localStorage): RoomSession | null {
  return getAllRoomSessions(storage)[sessionKey] ?? null;
}

export function saveRoomSession(
  session: Omit<RoomSession, 'updatedAt'> & { updatedAt?: number },
  storage: Storage = localStorage,
): string | null {
  const normalized = parseRoomSession({ ...session, updatedAt: session.updatedAt ?? Date.now() });
  if (!normalized) return null;
  const sessionKey = makeRoomSessionKey(normalized.roomId, normalized.playerId);
  const sessions = getAllRoomSessions(storage);
  sessions[sessionKey] = normalized;
  return writeJson(storage, SESSIONS_KEY, sessions) ? sessionKey : null;
}

export function removeRoomSession(sessionKey: string, storage: Storage = localStorage): void {
  const sessions = getAllRoomSessions(storage);
  if (!(sessionKey in sessions)) return;
  delete sessions[sessionKey];
  writeJson(storage, SESSIONS_KEY, sessions);
}

export function updateRoomSessionIdentity(
  sessionKey: string,
  updates: { roomId: string; displayName: string },
  storage: Storage = localStorage,
): { sessionKey: string; session: RoomSession } | null {
  const existing = getRoomSession(sessionKey, storage);
  if (!existing) return null;
  const canonicalKey = saveRoomSession({
    roomId: updates.roomId,
    playerId: existing.playerId,
    sessionToken: existing.sessionToken,
    displayName: updates.displayName,
  }, storage);
  if (!canonicalKey) return null;
  if (canonicalKey !== sessionKey) removeRoomSession(sessionKey, storage);
  const session = getRoomSession(canonicalKey, storage);
  return session ? { sessionKey: canonicalKey, session } : null;
}

export function setActiveTabSession(sessionKey: string, storage: Storage = sessionStorage): void {
  try { storage.setItem(ACTIVE_SESSION_KEY, sessionKey); } catch { /* Keep runtime state. */ }
}

export function getActiveTabSession(storage: Storage = sessionStorage): string | null {
  try {
    const sessionKey = storage.getItem(ACTIVE_SESSION_KEY);
    return isNonEmptyString(sessionKey) ? sessionKey : null;
  } catch { return null; }
}

export function clearActiveTabSession(expectedSessionKey?: string, storage: Storage = sessionStorage): void {
  try {
    if (expectedSessionKey && storage.getItem(ACTIVE_SESSION_KEY) !== expectedSessionKey) return;
    storage.removeItem(ACTIVE_SESSION_KEY);
  } catch { /* Storage can be restricted. */ }
}

function readLegacySession(storage: Storage): Omit<RoomSession, 'updatedAt'> | null {
  try {
    const roomId = storage.getItem(LEGACY_KEYS.roomId);
    const playerId = storage.getItem(LEGACY_KEYS.playerId);
    const sessionToken = storage.getItem(LEGACY_KEYS.sessionToken);
    if (!isNonEmptyString(roomId) || !isNonEmptyString(playerId) || !isNonEmptyString(sessionToken)) return null;
    return {
      roomId: normalizeRoomCode(roomId),
      playerId: playerId.trim(),
      sessionToken,
      displayName: 'Saved player',
    };
  } catch { return null; }
}

function removeLegacyKeys(storage: Storage): void {
  try {
    storage.removeItem(LEGACY_KEYS.roomId);
    storage.removeItem(LEGACY_KEYS.playerId);
    storage.removeItem(LEGACY_KEYS.sessionToken);
  } catch { /* Ignore unavailable storage. */ }
}

export function migrateLegacySingletonSession(
  persistentStorage: Storage = localStorage,
  tabStorage: Storage = sessionStorage,
): RoomSession | null {
  const legacySession = readLegacySession(persistentStorage) ?? readLegacySession(tabStorage);
  if (!legacySession) return null;
  const sessionKey = saveRoomSession(legacySession, persistentStorage);
  if (sessionKey && !getActiveTabSession(tabStorage)) setActiveTabSession(sessionKey, tabStorage);
  removeLegacyKeys(persistentStorage);
  removeLegacyKeys(tabStorage);
  return sessionKey ? getRoomSession(sessionKey, persistentStorage) : null;
}

export function getSessionStartupDecision(
  persistentStorage: Storage = localStorage,
  tabStorage: Storage = sessionStorage,
): SessionStartupDecision {
  migrateLegacySingletonSession(persistentStorage, tabStorage);
  const activeSessionKey = getActiveTabSession(tabStorage);
  if (activeSessionKey) {
    const activeSession = getRoomSession(activeSessionKey, persistentStorage);
    if (activeSession) return { kind: 'resume', sessionKey: activeSessionKey, session: activeSession };
    clearActiveTabSession(activeSessionKey, tabStorage);
  }
  const sessions = Object.entries(getAllRoomSessions(persistentStorage))
    .map(([sessionKey, session]) => ({ sessionKey, session }))
    .sort((a, b) => b.session.updatedAt - a.session.updatedAt);
  if (sessions.length === 0) return { kind: 'none' };
  if (sessions.length === 1) {
    return { kind: 'resume', ...sessions[0] };
  }
  return { kind: 'choose', sessions };
}

function getSessionOwners(storage: Storage, now: number): SessionOwnerRegistry {
  const parsed = readJson(storage, OWNERS_KEY);
  if (!isRecord(parsed)) return {};
  const owners: SessionOwnerRegistry = {};
  for (const [sessionKey, value] of Object.entries(parsed)) {
    if (!isRecord(value)
      || !isNonEmptyString(value.tabId)
      || typeof value.updatedAt !== 'number'
      || !Number.isFinite(value.updatedAt)
      || now - value.updatedAt >= OWNER_TTL_MS) continue;
    owners[sessionKey] = { tabId: value.tabId, updatedAt: value.updatedAt };
  }
  return owners;
}

export function claimTabSession(
  sessionKey: string,
  tabId: string,
  takeOver = false,
  storage: Storage = localStorage,
  now = Date.now(),
): boolean {
  if (!isNonEmptyString(sessionKey) || !isNonEmptyString(tabId)) return false;
  const owners = getSessionOwners(storage, now);
  const owner = owners[sessionKey];
  if (owner && owner.tabId !== tabId && !takeOver) return false;
  owners[sessionKey] = { tabId, updatedAt: now };
  return writeJson(storage, OWNERS_KEY, owners);
}

export function refreshTabSessionClaim(
  sessionKey: string,
  tabId: string,
  storage: Storage = localStorage,
  now = Date.now(),
): boolean {
  const owners = getSessionOwners(storage, now);
  if (owners[sessionKey]?.tabId !== tabId) return false;
  owners[sessionKey] = { tabId, updatedAt: now };
  return writeJson(storage, OWNERS_KEY, owners);
}

export function releaseTabSession(
  sessionKey: string,
  tabId: string,
  storage: Storage = localStorage,
  now = Date.now(),
): void {
  const owners = getSessionOwners(storage, now);
  if (owners[sessionKey]?.tabId !== tabId) return;
  delete owners[sessionKey];
  writeJson(storage, OWNERS_KEY, owners);
}

export function finalizeRejectedRoomSession(
  sessionKey: string,
  tabId: string,
  persistentStorage: Storage = localStorage,
  tabStorage: Storage = sessionStorage,
  now = Date.now(),
): RejectedSessionCleanupResult {
  const hadSession = getRoomSession(sessionKey, persistentStorage) !== null;
  const ownsSession = claimTabSession(sessionKey, tabId, false, persistentStorage, now);
  if (ownsSession) {
    releaseTabSession(sessionKey, tabId, persistentStorage, now);
    if (hadSession) removeRoomSession(sessionKey, persistentStorage);
  }
  clearActiveTabSession(sessionKey, tabStorage);

  const remainingSessions = getAllRoomSessions(persistentStorage);
  return {
    removed: hadSession && ownsSession,
    destination: Object.keys(remainingSessions).length > 0 ? 'resume' : 'landing',
    remainingSessions,
  };
}

export function finalizeValidatedRejectedRoomSession(
  sessionKey: string,
  persistentStorage: Storage = localStorage,
  tabStorage: Storage = sessionStorage,
  now = Date.now(),
): RejectedSessionCleanupResult {
  const hadSession = getRoomSession(sessionKey, persistentStorage) !== null;
  if (hadSession) removeRoomSession(sessionKey, persistentStorage);
  clearActiveTabSession(sessionKey, tabStorage);

  const owners = getSessionOwners(persistentStorage, now);
  if (sessionKey in owners) {
    delete owners[sessionKey];
    writeJson(persistentStorage, OWNERS_KEY, owners);
  }

  const remainingSessions = getAllRoomSessions(persistentStorage);
  return {
    removed: hadSession,
    destination: Object.keys(remainingSessions).length > 0 ? 'resume' : 'landing',
    remainingSessions,
  };
}
