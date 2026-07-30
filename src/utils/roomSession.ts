export interface RoomSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
}

const ROOM_SESSION_KEYS = {
  roomId: 'mendicot.roomId',
  playerId: 'mendicot.playerId',
  sessionToken: 'mendicot.sessionToken',
} as const;

function isValidSessionValue(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readRoomSession(storage: Storage): RoomSession | null {
  try {
    const roomId = storage.getItem(ROOM_SESSION_KEYS.roomId);
    const playerId = storage.getItem(ROOM_SESSION_KEYS.playerId);
    const sessionToken = storage.getItem(ROOM_SESSION_KEYS.sessionToken);

    if (!isValidSessionValue(roomId) || !isValidSessionValue(playerId) || !isValidSessionValue(sessionToken)) {
      return null;
    }

    return { roomId, playerId, sessionToken };
  } catch {
    return null;
  }
}

function removeRoomSession(storage: Storage): void {
  try {
    storage.removeItem(ROOM_SESSION_KEYS.roomId);
    storage.removeItem(ROOM_SESSION_KEYS.playerId);
    storage.removeItem(ROOM_SESSION_KEYS.sessionToken);
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function saveRoomSession(session: RoomSession): void {
  try {
    localStorage.setItem(ROOM_SESSION_KEYS.roomId, session.roomId);
    localStorage.setItem(ROOM_SESSION_KEYS.playerId, session.playerId);
    localStorage.setItem(ROOM_SESSION_KEYS.sessionToken, session.sessionToken);
  } catch {
    // Runtime state and the active socket remain usable if persistence is unavailable.
  }
}

export function loadRoomSession(): RoomSession | null {
  return readRoomSession(localStorage);
}

export function clearRoomSession(): void {
  removeRoomSession(localStorage);
  removeRoomSession(sessionStorage);
}

export function migrateLegacySession(): RoomSession | null {
  const savedSession = loadRoomSession();
  if (savedSession) return savedSession;

  const legacySession = readRoomSession(sessionStorage);
  if (!legacySession) return null;

  saveRoomSession(legacySession);
  removeRoomSession(sessionStorage);
  return legacySession;
}