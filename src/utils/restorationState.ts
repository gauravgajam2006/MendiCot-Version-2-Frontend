import type { SessionValidationRejectionCode } from '../api/sessionValidation.ts';

export type RestorationState =
  | 'validating-session'
  | 'restoring-session'
  | 'session-expired'
  | 'room-closed'
  | 'session-invalid'
  | 'backend-unavailable'
  | 'resume-selection'
  | 'idle';

export const INITIAL_RESTORATION_STATE: RestorationState = 'validating-session';

export function restorationStateForStartup(kind: 'none' | 'resume' | 'choose'): RestorationState {
  if (kind === 'resume') return 'validating-session';
  if (kind === 'choose') return 'resume-selection';
  return 'idle';
}

export function restorationStateForCode(code: SessionValidationRejectionCode): RestorationState {
  if (code === 'ROOM_NOT_FOUND') return 'room-closed';
  if (code === 'INVALID_SESSION') return 'session-invalid';
  return 'session-expired';
}

export function isRestorationNoticeState(
  state: RestorationState,
): state is 'session-expired' | 'room-closed' | 'session-invalid' {
  return state === 'session-expired' || state === 'room-closed' || state === 'session-invalid';
}
