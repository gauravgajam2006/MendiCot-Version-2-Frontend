/**
 * rooms.ts – Room-related API calls for the MendiCot backend.
 *
 * All functions call through the generic `request()` helper so that
 * JSON handling, headers, and error mapping are consistent.
 */

import type { PlayerCount, TrumpMode } from '@/types';
import { request } from './api';

// ---------------------------------------------------------------------------
// Request / Response interfaces
// ---------------------------------------------------------------------------

/** Response returned by `POST /api/rooms`. */
export interface CreateRoomResponse {
  room_id: string;
}

/** Body sent to `POST /api/rooms` to create a new room. */
export interface CreateRoomRequest {
  player_count: PlayerCount;
  trump_mode: TrumpMode;
}

/** Body sent to `POST /api/rooms/{roomId}/join` to join an existing room. */
export interface JoinRoomRequest {
  player_id: string;
  display_name: string;
}

/** Response returned by `POST /api/rooms/{roomId}/join`. */
export interface JoinRoomResponse {
  room_id: string;
  player_id: string;
  session_token: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/** Create a new game room. */
export function createRoom(body: CreateRoomRequest): Promise<CreateRoomResponse> {
  return request<CreateRoomResponse>('/api/rooms', {
    method: 'POST',
    body,
  });
}

/** Join an existing room by ID. */
export function joinRoom(roomId: string, body: JoinRoomRequest): Promise<JoinRoomResponse> {
  return request<JoinRoomResponse>(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    method: 'POST',
    body,
  });
}