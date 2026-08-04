import type { RoomState, TeamId } from '@/types';
import type { BackendRoomState, BackendTeamId } from './roomState';
import { authoritativeTeamNames } from '../utils/teamNames.ts';

const TEAM_ID_MAP: Record<BackendTeamId, TeamId> = {
  TeamA: 'A',
  TeamB: 'B',
};

/** Converts a backend room snapshot into the shape consumed by the UI. */
export function adaptRoomState(
  state: BackendRoomState,
  currentPlayerId: string,
  fallbackTeamNames?: RoomState['teams'],
): RoomState {
  return {
    status: state.status,
    config: {
      code: state.room_id.toUpperCase(),
      playerCount: state.player_count,
      trumpMode: state.trump_mode,
    },
    players: [...state.players].sort((a, b) => a.seat_index - b.seat_index).map((player) => ({
      id: player.player_id,
      displayName: player.display_name,
      team: TEAM_ID_MAP[player.team_id],
      seatIndex: player.seat_index,
      isHost: player.player_id === state.host_id,
      isReady: player.is_online,
      connection: player.is_online ? 'online' : 'offline',
      isCurrentPlayer: player.player_id === currentPlayerId,
    })),
    hostId: state.host_id ?? '',
    teams: authoritativeTeamNames(state.team_names, fallbackTeamNames),
  };
}
