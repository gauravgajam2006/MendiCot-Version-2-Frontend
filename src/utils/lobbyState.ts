import type { BackendTeamId } from '../api/roomState';
import type { WsOutboundMessage } from '../api/websocket';
import type { Player, RoomState, TeamId } from '../types';

export interface TeamSwitchControl {
  label: string;
  targetTeam: TeamId;
}

export interface TeamSwitchRequest {
  pendingTeamId: BackendTeamId;
  message: WsOutboundMessage;
}

export interface LobbyStartState {
  canStart: boolean;
  reason: string;
  requiredTeamSize: number;
  teamCounts: Record<TeamId, number>;
}

export interface LobbyActionError {
  action: 'switch-team' | 'start-game';
  message: string;
}

const START_ERROR_MESSAGES: Record<string, string> = {
  ROOM_NOT_FULL: 'Waiting for players.',
  PLAYER_OFFLINE: 'A player is offline.',
  TEAMS_UNBALANCED: 'Teams must be balanced before starting.',
  HOST_ONLY: 'Only the host can start the game.',
  GAME_ALREADY_STARTED: 'The game has already started.',
};

export function toBackendTeamId(team: TeamId): BackendTeamId {
  return team === 'A' ? 'TeamA' : 'TeamB';
}

export function getTeamSwitchControl(player: Player, currentPlayerId: string): TeamSwitchControl | null {
  if (player.id !== currentPlayerId || !player.isCurrentPlayer) return null;
  return player.team === 'A'
    ? { label: 'Switch to Team Gold', targetTeam: 'B' }
    : { label: 'Switch to Team Maroon', targetTeam: 'A' };
}

export function createTeamSwitchRequest(
  pendingTeamId: BackendTeamId | null,
  targetTeam: TeamId,
): TeamSwitchRequest | null {
  if (pendingTeamId !== null) return null;
  const backendTeamId = toBackendTeamId(targetTeam);
  return {
    pendingTeamId: backendTeamId,
    message: {
      action: 'SWITCH_TEAM',
      payload: { team_id: backendTeamId },
    },
  };
}

export function isTeamSwitchConfirmed(
  pendingTeamId: BackendTeamId | null,
  authoritativeTeamId: BackendTeamId,
): boolean {
  return pendingTeamId !== null && pendingTeamId === authoritativeTeamId;
}

export function getLobbyStartState(room: RoomState, currentPlayerId: string): LobbyStartState {
  const requiredTeamSize = room.config.playerCount / 2;
  const teamCounts = room.players.reduce<Record<TeamId, number>>(
    (counts, player) => ({ ...counts, [player.team]: counts[player.team] + 1 }),
    { A: 0, B: 0 },
  );
  const isHost = room.hostId === currentPlayerId;
  const roomIsFull = room.players.length === room.config.playerCount;
  const allPlayersOnline = room.players.every((player) => player.connection === 'online');
  const teamsBalanced = teamCounts.A === requiredTeamSize && teamCounts.B === requiredTeamSize;

  let reason = 'All players are online and teams are balanced.';
  if (room.status !== 'WAITING') reason = 'The game has already started.';
  else if (!roomIsFull) reason = 'Waiting for players.';
  else if (!allPlayersOnline) reason = 'A player is offline.';
  else if (!teamsBalanced) reason = 'Teams must be balanced before starting.';
  else if (!isHost) reason = 'The host will start the game.';

  return {
    canStart: isHost && room.status === 'WAITING' && roomIsFull && allPlayersOnline && teamsBalanced,
    reason,
    requiredTeamSize,
    teamCounts,
  };
}

export function resolveLobbyActionError(
  payload: unknown,
  pendingTeamId: BackendTeamId | null,
  startPending: boolean,
): LobbyActionError | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code : 'UNKNOWN_ERROR';
  const action = typeof record.action === 'string' ? record.action : null;

  if (pendingTeamId !== null && (action === null || action === 'SWITCH_TEAM')) {
    return { action: 'switch-team', message: 'Could not switch teams. Please try again.' };
  }
  if (startPending && (action === null || action === 'START_GAME')) {
    return {
      action: 'start-game',
      message: START_ERROR_MESSAGES[code] ?? 'Could not start the game. Please try again.',
    };
  }
  return null;
}
