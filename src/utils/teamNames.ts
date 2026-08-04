import type { BackendTeamId } from '@/api';
import type { WsOutboundMessage } from '@/api';
import type { TeamId } from '@/types';

export const DEFAULT_TEAM_NAMES: Record<TeamId, string> = {
  A: 'Team Maroon',
  B: 'Team Gold',
};

export type BackendTeamNames = Partial<Record<BackendTeamId, string>>;

export function authoritativeTeamNames(
  teamNames: BackendTeamNames | undefined,
  fallback: Record<TeamId, string> = DEFAULT_TEAM_NAMES,
): Record<TeamId, string> {
  return {
    A: teamNames?.TeamA?.trim() || fallback.A,
    B: teamNames?.TeamB?.trim() || fallback.B,
  };
}

export function normalizeTeamName(value: string): string | null {
  const name = value.trim();
  return name.length > 0 ? name : null;
}

export function createTeamRenameRequest(
  pendingName: string | null,
  name: string,
): WsOutboundMessage | null {
  if (pendingName !== null || !normalizeTeamName(name)) return null;
  return { action: 'RENAME_TEAM', payload: { name: normalizeTeamName(name)! } };
}

export function isTeamRenameConfirmed(
  pendingName: string | null,
  team: TeamId,
  teamNames: BackendTeamNames | undefined,
): boolean {
  if (pendingName === null || !teamNames) return false;
  const authoritativeName = team === 'A' ? teamNames.TeamA : teamNames.TeamB;
  return typeof authoritativeName === 'string' && authoritativeName.trim() === pendingName;
}

const RENAME_ERROR_MESSAGES: Record<string, string> = {
  INVALID_TEAM_NAME: 'Enter a valid team name.',
  TEAM_NAME_TOO_LONG: 'That team name is too long.',
  INVALID_PHASE: 'Team names cannot be changed right now.',
  PLAYER_NOT_FOUND: 'Your player session is no longer available.',
};

export function resolveTeamRenameError(payload: unknown, pendingName: string | null): string | null {
  if (pendingName === null || typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const error = payload as Record<string, unknown>;
  const action = typeof error.action === 'string' ? error.action : null;
  if (action !== null && action !== 'RENAME_TEAM') return null;
  const code = typeof error.code === 'string' ? error.code : 'UNKNOWN_ERROR';
  return RENAME_ERROR_MESSAGES[code] ?? 'Could not rename your team. Please try again.';
}

export function isBackendTeamNames(value: unknown): value is BackendTeamNames {
  if (value === undefined) return true;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const names = value as Record<string, unknown>;
  return (names.TeamA === undefined || typeof names.TeamA === 'string')
    && (names.TeamB === undefined || typeof names.TeamB === 'string');
}

export const TEAM_NAME_DOUBLE_TAP_WINDOW_MS = 320;

export function isDoubleTap(lastTapAt: number | null, nextTapAt: number): boolean {
  return lastTapAt !== null && nextTapAt > lastTapAt && nextTapAt - lastTapAt <= TEAM_NAME_DOUBLE_TAP_WINDOW_MS;
}
