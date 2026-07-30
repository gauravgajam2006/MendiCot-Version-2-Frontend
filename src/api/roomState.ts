import type { PlayerCount, TrumpMode } from '@/types';

/** Player data as sent by the room WebSocket. */
export interface BackendRoomPlayer {
  player_id: string;
  display_name: string;
  is_online: boolean;
}

/** Room snapshot data as sent by the room WebSocket. */
export interface BackendRoomState {
  room_id: string;
  status: 'WAITING' | 'IN_GAME';
  host_id: string | null;
  player_count: PlayerCount;
  trump_mode: TrumpMode;
  players: BackendRoomPlayer[];
}

/** Initial and subsequent WebSocket room-state events. */
export interface RoomStateUpdateMessage {
  type: 'ROOM_STATE_UPDATE';
  payload: BackendRoomState;
}