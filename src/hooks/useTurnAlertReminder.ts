import { useEffect, useRef, useState } from 'react';
import type { BackendGamePhase } from '@/api/gameState';
import { playTurnAlertSound } from '@/utils/turnAlertSound';
import { getTurnAlertPreferences, subscribeToTurnAlertPreferences } from '@/utils/turnAlerts';
import { TURN_ALERT_VIBRATION_PATTERN, TurnAlertReminderController } from '@/utils/turnAlertReminder';
interface UseTurnAlertReminderOptions { meId: string; currentTurnPlayerId: string | null; phase: BackendGamePhase; gameId: string; gameVersion: number; connected: boolean; }
function isDocumentVisible(): boolean { return typeof document === 'undefined' || document.visibilityState === 'visible'; }
function vibrateTurnAlert(): void { try { if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate([...TURN_ALERT_VIBRATION_PATTERN]); } catch { /* unsupported vibration is silent */ } }
export function useTurnAlertReminder(options: UseTurnAlertReminderOptions): void {
  const [preferences, setPreferences] = useState(getTurnAlertPreferences);
  const [visible, setVisible] = useState(isDocumentVisible);
  const controllerRef = useRef<TurnAlertReminderController | null>(null);
  if (!controllerRef.current) controllerRef.current = new TurnAlertReminderController((sound) => { void playTurnAlertSound(sound); }, vibrateTurnAlert);
  useEffect(() => subscribeToTurnAlertPreferences(() => setPreferences(getTurnAlertPreferences())), []);
  useEffect(() => { const onVisibilityChange = () => setVisible(isDocumentVisible()); document.addEventListener('visibilitychange', onVisibilityChange); return () => document.removeEventListener('visibilitychange', onVisibilityChange); }, []);
  useEffect(() => () => controllerRef.current?.cancel(), []);
  useEffect(() => { controllerRef.current!.update({ ...options, enabled: preferences.enabled, selectedSound: preferences.sound, visible }); }, [options, preferences, visible]);
}
