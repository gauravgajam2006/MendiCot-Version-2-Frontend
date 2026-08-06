import type { BackendGamePhase } from '../api/gameState';
import type { WsOutboundMessage } from '../api/websocket';
import type { GameScreen, RoomStatus } from '../types';

export function isBackendGamePhase(value: unknown): value is BackendGamePhase {
  return value === 'CREATED'
    || value === 'FIRST_PLAYER_SELECTION'
    || value === 'DEALING'
    || value === 'HIDDEN_TRUMP_SELECTION'
    || value === 'HIDDEN_TRUMP_REVEAL'
    || value === 'TRUMP_REVEAL_DISPLAY'
    || value === 'HIDDEN_CARD_RETURN'
    || value === 'PLAYING'
    || value === 'TRICK_RESOLUTION'
    || value === 'FINAL_SCORE_DISPLAY'
    || value === 'GAME_OVER'
    || value === 'DRAW';
}

export function screenForAuthoritativeState(
  roomStatus: RoomStatus,
  phase: BackendGamePhase | null,
  meId?: string,
  returnedToLobbyPlayerIds?: string[],
): GameScreen | null {
  if (roomStatus === 'WAITING') return 'lobby';
  if (roomStatus === 'GAME_SETUP' || phase === 'FIRST_PLAYER_SELECTION') {
    return 'host-setup';
  }
  if (phase === 'CREATED') return null;
  if (phase === 'HIDDEN_TRUMP_SELECTION' || phase === 'HIDDEN_TRUMP_REVEAL') return 'hidden-trump';
  if (phase === 'GAME_OVER' || phase === 'DRAW') {
    if (meId !== undefined && returnedToLobbyPlayerIds?.includes(meId)) return 'post-game-lobby';
    return 'game-end';
  }
  return 'game';
}

export function shouldAcceptGamePhase(
  currentPhase: BackendGamePhase | null,
  incomingPhase: BackendGamePhase,
): boolean {
  if (currentPhase === null || currentPhase === incomingPhase) return true;
  if (incomingPhase === 'FIRST_PLAYER_SELECTION') return false;
  if (incomingPhase === 'CREATED') return currentPhase === 'FIRST_PLAYER_SELECTION';
  return true;
}

export function resolveSetupActionError(
  payload: unknown,
  cancelPending: boolean,
  firstPlayerPending: boolean,
): string | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const action = typeof record.action === 'string' ? record.action : null;

  if (cancelPending && (action === null || action === 'CANCEL_GAME_SETUP')) {
    return 'Could not cancel game setup. Please try again.';
  }
  if (firstPlayerPending && (action === null || action === 'SELECT_FIRST_PLAYER')) {
    return 'Could not select the first player. Please try again.';
  }
  return null;
}

export function createCancelGameSetupRequest(pending: boolean): WsOutboundMessage | null {
  return pending ? null : { action: 'CANCEL_GAME_SETUP', payload: {} };
}

export function createFirstPlayerSelectionRequest(
  pending: boolean,
  playerId: string,
): WsOutboundMessage | null {
  return pending ? null : {
    action: 'SELECT_FIRST_PLAYER',
    payload: { player_id: playerId },
  };
}
