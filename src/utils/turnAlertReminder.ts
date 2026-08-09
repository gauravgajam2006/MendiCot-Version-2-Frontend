import type { BackendGamePhase } from '@/api/gameState';
import type { TurnAlertSound } from './turnAlerts';

export const TURN_ALERT_INITIAL_DELAY_MS = 4_000;
export const TURN_ALERT_REPEAT_DELAY_MS = 10_000;
export const TURN_ALERT_SOUND_GAP_MS = 450;
export const TURN_ALERT_VIBRATION_PATTERN = [120, 180, 120, 180, 120] as const;

export interface TurnAlertReminderSnapshot { enabled: boolean; selectedSound: TurnAlertSound; meId: string; currentTurnPlayerId: string | null; phase: BackendGamePhase; gameId: string; gameVersion: number; connected: boolean; visible: boolean; }
export type TurnAlertTimer = number;
export interface TurnAlertReminderEnvironment { setTimeout: (handler: () => void, timeout: number) => TurnAlertTimer; clearTimeout: (timer: TurnAlertTimer) => void; }
// Keep browser-native timers attached to window. Storing the native methods directly
// detaches their receiver and can throw "Illegal invocation" in browser environments.
const browserTimers: TurnAlertReminderEnvironment = {
  setTimeout: (handler, timeout) => window.setTimeout(handler, timeout),
  clearTimeout: (timer) => window.clearTimeout(timer),
};
export function isPlayableTurnAlertPhase(phase: BackendGamePhase): boolean { return phase === 'PLAYING'; }
function canAlert(snapshot: TurnAlertReminderSnapshot): boolean { return snapshot.enabled && snapshot.connected && snapshot.visible && snapshot.meId !== '' && snapshot.currentTurnPlayerId === snapshot.meId && isPlayableTurnAlertPhase(snapshot.phase); }
function cycleKey(snapshot: TurnAlertReminderSnapshot): string { return [snapshot.enabled, snapshot.meId, snapshot.currentTurnPlayerId, snapshot.phase, snapshot.gameId, snapshot.gameVersion, snapshot.connected, snapshot.visible].join('|'); }

/** One foreground-only reminder cycle, guarded by a generation per authoritative turn. */
export class TurnAlertReminderController {
  private snapshot: TurnAlertReminderSnapshot | null = null;
  private activeKey: string | null = null;
  private generation = 0;
  private timers = new Set<TurnAlertTimer>();
  private readonly onSound: (sound: TurnAlertSound) => void;
  private readonly onVibrate: () => void;
  private readonly timersApi: TurnAlertReminderEnvironment;
  constructor(onSound: (sound: TurnAlertSound) => void, onVibrate: () => void, timersApi: TurnAlertReminderEnvironment = browserTimers) {
    this.onSound = onSound;
    this.onVibrate = onVibrate;
    this.timersApi = timersApi;
  }
  update(snapshot: TurnAlertReminderSnapshot): void {
    this.snapshot = snapshot;
    const key = cycleKey(snapshot);
    if (key === this.activeKey) return; // A sound-only preference change keeps the timing.
    this.cancel(); this.activeKey = key;
    if (canAlert(snapshot)) this.schedule(TURN_ALERT_INITIAL_DELAY_MS, this.generation, () => this.emitBurst());
  }
  cancel(): void { this.generation += 1; this.timers.forEach((timer) => this.timersApi.clearTimeout(timer)); this.timers.clear(); this.activeKey = null; }
  private schedule(delay: number, generation: number, handler: () => void): void {
    const timer = this.timersApi.setTimeout(() => { this.timers.delete(timer); if (generation !== this.generation || !this.snapshot || !canAlert(this.snapshot)) return; handler(); }, delay);
    this.timers.add(timer);
  }
  private emitBurst(): void {
    const generation = this.generation;
    this.onSound(this.snapshot!.selectedSound); this.onVibrate();
    this.schedule(TURN_ALERT_SOUND_GAP_MS, generation, () => this.onSound(this.snapshot!.selectedSound));
    this.schedule(TURN_ALERT_SOUND_GAP_MS * 2, generation, () => this.onSound(this.snapshot!.selectedSound));
    this.schedule(TURN_ALERT_REPEAT_DELAY_MS, generation, () => this.emitBurst());
  }
}
