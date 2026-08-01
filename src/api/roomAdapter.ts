import type { RoomState } from '@/types';
import type { BackendRoomState } from './roomState';

/** Converts a backend room snapshot into the shape consumed by the UI. */
export function adaptRoomState(state: BackendRoomState, currentPlayerId: string): RoomState {
  return {
    config: {
      code: state.room_id.toUpperCase(),
      playerCount: state.player_count,
      trumpMode: state.trump_mode,
    },
    players: state.players.map((player, index) => ({
      id: player.player_id,
      displayName: player.display_name,
      team: index % 2 === 0 ? 'A' : 'B',
      seatIndex: index,
      isHost: player.player_id === state.host_id,
      isReady: player.is_online,
      connection: player.is_online ? 'online' : 'offline',
      isCurrentPlayer: player.player_id === currentPlayerId,
    })),
    hostId: state.host_id ?? '',
    teams: { A: 'Team Maroon', B: 'Team Gold' },
  };
}
