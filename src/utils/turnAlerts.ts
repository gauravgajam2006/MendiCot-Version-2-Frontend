import { getActiveTabSession } from './roomSession.ts';

export const TURN_ALERTS_STORAGE_KEY = 'mendicot.turnAlerts.v2';

export const TURN_ALERT_SOUNDS = [
  { id: 'soft-chime', label: 'Soft Chime' },
  { id: 'wooden-click', label: 'Wooden Click' },
  { id: 'subtle-bell', label: 'Subtle Bell' },
] as const;

export type TurnAlertSound = (typeof TURN_ALERT_SOUNDS)[number]['id'];

export interface TurnAlertPreferences {
  enabled: boolean;
  sound: TurnAlertSound;
}

export const DEFAULT_TURN_ALERT_PREFERENCES: TurnAlertPreferences = { enabled: true, sound: 'soft-chime' };

type PreferenceListener = () => void;
const listeners = new Set<PreferenceListener>();

function isSound(value: unknown): value is TurnAlertSound {
  return typeof value === 'string' && TURN_ALERT_SOUNDS.some((sound) => sound.id === value);
}

export function parseTurnAlertPreferences(raw: string | null): TurnAlertPreferences {
  if (!raw) return DEFAULT_TURN_ALERT_PREFERENCES;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return DEFAULT_TURN_ALERT_PREFERENCES;
    const candidate = value as Partial<TurnAlertPreferences>;
    if (typeof candidate.enabled !== 'boolean' || !isSound(candidate.sound)) return DEFAULT_TURN_ALERT_PREFERENCES;
    return { enabled: candidate.enabled, sound: candidate.sound };
  } catch {
    return DEFAULT_TURN_ALERT_PREFERENCES;
  }
}

export function getTurnAlertPreferenceScope(tabStorage?: Storage): string | null {
  try {
    const target = tabStorage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
    return target ? getActiveTabSession(target) : null;
  } catch {
    return null;
  }
}

export function getTurnAlertStorageKey(scope: string): string {
  return `${TURN_ALERTS_STORAGE_KEY}:${encodeURIComponent(scope)}`;
}

export function getTurnAlertPreferences(storage?: Storage, scope = getTurnAlertPreferenceScope()): TurnAlertPreferences {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    return target && scope ? parseTurnAlertPreferences(target.getItem(getTurnAlertStorageKey(scope))) : DEFAULT_TURN_ALERT_PREFERENCES;
  } catch {
    return DEFAULT_TURN_ALERT_PREFERENCES;
  }
}

export function setTurnAlertPreferences(preferences: TurnAlertPreferences, storage?: Storage, scope = getTurnAlertPreferenceScope()): void {
  try {
    const target = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (target && scope) target.setItem(getTurnAlertStorageKey(scope), JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable in private browsing; the in-memory UI still updates.
  }
  listeners.forEach((listener) => listener());
}

export function updateTurnAlertPreferences(update: Partial<TurnAlertPreferences>): void {
  setTurnAlertPreferences({ ...getTurnAlertPreferences(), ...update });
}

export function isTurnAlertStorageEventForScope(event: Pick<StorageEvent, 'key'>, scope = getTurnAlertPreferenceScope()): boolean {
  return Boolean(scope && event.key === getTurnAlertStorageKey(scope));
}

function handleStorageEvent(event: StorageEvent): void {
  if (isTurnAlertStorageEventForScope(event)) listeners.forEach((listener) => listener());
}

export function subscribeToTurnAlertPreferences(listener: PreferenceListener): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') window.addEventListener('storage', handleStorageEvent);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') window.removeEventListener('storage', handleStorageEvent);
  };
}