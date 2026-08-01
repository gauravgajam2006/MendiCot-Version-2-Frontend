export type JoinErrorKind = 'room-not-found' | 'room-full' | 'game-started' | 'invalid-request' | 'generic';

function getBackendDetail(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return '';
  const detail = (body as Record<string, unknown>).detail;
  return typeof detail === 'string' ? detail.toLowerCase() : '';
}

export function classifyJoinError(status: number, body: unknown): JoinErrorKind {
  const detail = getBackendDetail(body);
  if (status === 404
    || /room\s+not\s+found|\bnot\s+found\b|unknown\s+room|invalid\s+room\s+code|room\s+does\s+not\s+exist/.test(detail)) {
    return 'room-not-found';
  }
  if (/room\s+full|\bcapacity\b|maximum\s+players/.test(detail)) return 'room-full';
  if (/already\s+started|game\s+has\s+started|cannot\s+join\s+after/.test(detail)) return 'game-started';
  if (status === 400 || status === 422) return 'invalid-request';
  return 'generic';
}
