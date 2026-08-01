export type SessionCloseAction = 'expire-session' | 'retry';

const REJECTION_PATTERN = /room\s*(?:was\s*)?(?:not\s*found|deleted)|\bnot\s*found\b|unknown\s*room|room\s*does\s*not\s*exist|invalid\s*(?:session|token)|token\s*(?:is\s*)?(?:invalid|expired)|player\s*not\s*found|unknown\s*player|session\s*(?:is\s*)?expired|unauthori[sz]ed|forbidden|authentication\s*failed/i;

const REJECTION_MESSAGE_TYPES = new Set([
  'AUTHENTICATION_ERROR',
  'FORBIDDEN',
  'INVALID_SESSION',
  'INVALID_TOKEN',
  'PLAYER_NOT_FOUND',
  'ROOM_DELETED',
  'ROOM_NOT_FOUND',
  'SESSION_EXPIRED',
  'UNAUTHORIZED',
]);

function rejectionText(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return '';
  const record = payload as Record<string, unknown>;
  return ['detail', 'message', 'error', 'reason']
    .flatMap((key) => {
      const value = record[key];
      if (typeof value === 'string') return [value];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) return [rejectionText(value)];
      return [];
    })
    .join(' ');
}

export function isExplicitSessionRejectionMessage(message: { type: string; payload?: unknown }): boolean {
  const normalizedType = message.type.trim().toUpperCase().replace(/[\s-]+/g, '_');
  return REJECTION_MESSAGE_TYPES.has(normalizedType) || REJECTION_PATTERN.test(rejectionText(message.payload));
}

export function classifySessionClose(code: number, reason: string): SessionCloseAction {
  if (code === 1008 || (code >= 4000 && code < 5000) || REJECTION_PATTERN.test(reason)) {
    return 'expire-session';
  }
  return 'retry';
}

export interface SessionSocketIdentity {
  generation: number;
  sessionKey: string | null;
  playerId: string;
}

export function isCurrentSessionSocket(expected: SessionSocketIdentity, current: SessionSocketIdentity): boolean {
  return expected.generation === current.generation
    && expected.sessionKey === current.sessionKey
    && expected.playerId === current.playerId;
}
