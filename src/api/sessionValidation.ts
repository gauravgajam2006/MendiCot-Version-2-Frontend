import { normalizeRoomCode } from '../utils/roomCode.ts';
import { ApiError, request } from './api.ts';

export type SessionValidationRejectionCode = 'ROOM_NOT_FOUND' | 'SESSION_EXPIRED' | 'INVALID_SESSION';

export interface ValidateSessionResponse {
  valid: true;
  roomId: string;
  playerId: string;
  displayName: string;
  roomStatus: string;
  playerOnline: boolean;
}

export type ValidateRoomSessionResult =
  | { kind: 'valid'; session: ValidateSessionResponse }
  | { kind: 'rejected'; code: SessionValidationRejectionCode }
  | { kind: 'unavailable'; reason: 'network' | 'server' | 'malformed-response' };

interface BackendValidateSessionResponse {
  valid: unknown;
  room_id: unknown;
  player_id: unknown;
  display_name: unknown;
  room_status: unknown;
  player_online: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function parseSessionValidationErrorCode(body: unknown): SessionValidationRejectionCode | null {
  if (!isObject(body) || !isObject(body.detail)) return null;
  const code = body.detail.code;
  return code === 'ROOM_NOT_FOUND' || code === 'SESSION_EXPIRED' || code === 'INVALID_SESSION' ? code : null;
}

export function parseValidateSessionResponse(body: unknown, expectedPlayerId: string): ValidateSessionResponse | null {
  if (!isObject(body)) return null;
  const response = body as unknown as BackendValidateSessionResponse;
  if (response.valid !== true
    || !isNonEmptyString(response.room_id)
    || !isNonEmptyString(response.player_id)
    || response.player_id !== expectedPlayerId
    || !isNonEmptyString(response.display_name)
    || !isNonEmptyString(response.room_status)
    || typeof response.player_online !== 'boolean') return null;

  const roomId = normalizeRoomCode(response.room_id);
  if (!roomId) return null;
  return {
    valid: true,
    roomId,
    playerId: response.player_id,
    displayName: response.display_name.trim(),
    roomStatus: response.room_status,
    playerOnline: response.player_online,
  };
}

export async function validateRoomSession(
  roomId: string,
  playerId: string,
  sessionToken: string,
  signal?: AbortSignal,
): Promise<ValidateRoomSessionResult> {
  try {
    const body = await request<unknown>(`/api/rooms/${encodeURIComponent(normalizeRoomCode(roomId))}/sessions/validate`, {
      method: 'POST',
      body: { player_id: playerId, session_token: sessionToken },
      signal,
    });
    const session = parseValidateSessionResponse(body, playerId);
    return session ? { kind: 'valid', session } : { kind: 'unavailable', reason: 'malformed-response' };
  } catch (error) {
    if (error instanceof ApiError) {
      const code = parseSessionValidationErrorCode(error.body);
      if (code) return { kind: 'rejected', code };
      return { kind: 'unavailable', reason: error.status >= 500 ? 'server' : 'malformed-response' };
    }
    return { kind: 'unavailable', reason: 'network' };
  }
}

export async function validateBeforeOpeningSocket(
  validate: () => Promise<ValidateRoomSessionResult>,
  openSocket: (session: ValidateSessionResponse) => void,
): Promise<ValidateRoomSessionResult> {
  const result = await validate();
  if (result.kind === 'valid') openSocket(result.session);
  return result;
}
