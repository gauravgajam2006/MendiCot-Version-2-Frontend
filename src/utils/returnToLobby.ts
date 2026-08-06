import type { Player } from '../types';
import type { WsOutboundMessage } from '../api/websocket';

export const RETURN_TO_LOBBY_ACTION = 'RETURN_TO_LOBBY';

export const RETURN_TO_LOBBY_ERROR_MESSAGES: Record<string, string> = {
  INVALID_SESSION: 'Your session is no longer valid.',
  PLAYER_NOT_IN_ROOM: 'You are no longer part of this room.',
  INVALID_PHASE: 'The room cannot be returned right now.',
  GAME_NOT_STARTED: 'No completed match is available.',
};

export function createReturnToLobbyRequest(pending: boolean): WsOutboundMessage | null {
  return pending ? null : { action: RETURN_TO_LOBBY_ACTION, payload: {} };
}

export function resolveReturnToLobbyError(payload: unknown, pending: boolean): string | null {
  if (!pending || typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const action = typeof record.action === 'string' ? record.action : null;
  if (action !== null && action !== RETURN_TO_LOBBY_ACTION) return null;
  const code = typeof record.code === 'string' ? record.code : 'UNKNOWN_ERROR';
  return RETURN_TO_LOBBY_ERROR_MESSAGES[code] ?? 'Could not return to the lobby. Please try again.';
}

/** Whether the authoritative backend has marked this player as returned. */
export function isPlayerReturnedToLobby(
  playerId: string,
  returnedToLobbyPlayerIds: string[],
): boolean {
  return returnedToLobbyPlayerIds.includes(playerId);
}

export type ReturnToLobbyStatus = 'in-lobby' | 'still-in-game' | 'offline';

export const RETURN_TO_LOBBY_STATUS_LABELS: Record<ReturnToLobbyStatus, string> = {
  'in-lobby': 'In Lobby',
  'still-in-game': 'Still in the Game',
  offline: 'Offline',
};

export const RETURN_TO_LOBBY_STATUS_ORDER: Record<ReturnToLobbyStatus, number> = {
  offline: 0,
  'still-in-game': 1,
  'in-lobby': 2,
};

/**
 * Derive the post-game lobby status for a single player.
 *
 * Offline always wins; a returned player who is online is "In Lobby";
 * everyone else who is online is "Still in the Game".
 */
export function deriveReturnToLobbyStatus(
  player: Player,
  returnedToLobbyPlayerIds: string[],
): ReturnToLobbyStatus {
  if (player.connection === 'offline') return 'offline';
  if (isPlayerReturnedToLobby(player.id, returnedToLobbyPlayerIds)) return 'in-lobby';
  return 'still-in-game';
}

/**
 * Number of players currently present in the post-game lobby.
 *
 * Only online players who appear in the authoritative returned IDs count as
 * "in the lobby"; an offline player is not present, regardless of returned state.
 */
export function countPlayersInPostGameLobby(
  players: Player[],
  returnedToLobbyPlayerIds: string[],
): number {
  return players.filter(
    (player) => player.connection === 'online' && isPlayerReturnedToLobby(player.id, returnedToLobbyPlayerIds),
  ).length;
}
