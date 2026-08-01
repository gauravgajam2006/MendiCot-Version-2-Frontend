/**
 * src/api/index.ts – Barrel export for the networking layer.
 */

// Core
export { BASE_URL, ApiError, request } from './api';
export type { RequestOptions } from './api';

// Room endpoints
export { createRoom, joinRoom } from './rooms';
export type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
} from './rooms';

export { parseSessionValidationErrorCode, parseValidateSessionResponse, validateBeforeOpeningSocket, validateRoomSession } from './sessionValidation';
export type { SessionValidationRejectionCode, ValidateRoomSessionResult, ValidateSessionResponse } from './sessionValidation';

// Room-state transport and UI adapter
export { adaptRoomState } from './roomAdapter';
export type { BackendRoomPlayer, BackendRoomState, BackendTeamId, RoomStateUpdateMessage } from './roomState';

// WebSocket
export { GameSocket } from './websocket';
export type {
  WsOutboundMessage,
  WsInboundMessage,
  LeaveRoomResult,
} from './websocket';
