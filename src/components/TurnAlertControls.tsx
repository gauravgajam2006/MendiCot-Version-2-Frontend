import { useEffect, useState } from 'react';
import { Bell, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getBrowserNotificationStatus,
  requestNotificationPermission,
  type BrowserNotificationStatus,
} from '@/firebase/messaging';
import {
  getTurnAlertPreferences,
  subscribeToTurnAlertPreferences,
  TURN_ALERT_SOUNDS,
  updateTurnAlertPreferences,
} from '@/utils/turnAlerts';
import { playTurnAlertSound } from '@/utils/turnAlertSound';

function useTurnAlertPreferences() {
  const [preferences, setPreferences] = useState(getTurnAlertPreferences);
  useEffect(() => subscribeToTurnAlertPreferences(() => setPreferences(getTurnAlertPreferences())), []);
  return preferences;
}

function TurnAlertSwitch({ enabled, onChange, compact = false }: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Turn Alerts ${enabled ? 'on' : 'off'}`}
        onClick={() => onChange(!enabled)}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-50 focus-ring"
      >
        <Bell size={14} aria-hidden="true" />
        <span className="hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] min-[375px]:inline">Turn Alerts</span>
        <span aria-hidden="true" className={['relative h-5 w-9 overflow-hidden rounded-full ring-1 ring-inset transition-colors', enabled ? 'bg-emerald-500 ring-emerald-400/70' : 'bg-ink-900 ring-ink-600'].join(' ')}>
          <span className={['absolute top-0.5 h-4 w-4 rounded-full bg-bone-100 shadow-sm transition-[left]', enabled ? 'left-[18px]' : 'left-0.5'].join(' ')} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`Turn Alerts ${enabled ? 'on' : 'off'}`}
      onClick={() => onChange(!enabled)}
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-1 text-bone-200 focus-ring"
    >
      <span aria-hidden="true" className={['relative h-7 w-[52px] overflow-hidden rounded-full ring-1 ring-inset transition-colors', enabled ? 'bg-emerald-500 ring-emerald-400/70' : 'bg-ink-900 ring-ink-600'].join(' ')}>
        <span className={['absolute top-[3px] h-[22px] w-[22px] rounded-full bg-bone-100 shadow transition-[left]', enabled ? 'left-[27px]' : 'left-[3px]'].join(' ')} />
      </span>
      <span className="w-7 text-left text-xs font-semibold uppercase tracking-wide">{enabled ? 'On' : 'Off'}</span>
    </button>
  );
}

function notificationLabel(status: BrowserNotificationStatus): string {
  return ({
    'not-enabled': 'Not enabled',
    enabled: 'Enabled',
    blocked: 'Blocked',
    unsupported: 'Unsupported',
    error: 'Not enabled',
  })[status];
}

function NotificationControl({ onPermissionChanged }: {
  onPermissionChanged?: () => void;
}) {
  const [status, setStatus] = useState<BrowserNotificationStatus>(getBrowserNotificationStatus);
  useEffect(() => setStatus(getBrowserNotificationStatus()), []);
  const enable = async () => {
    const next = await requestNotificationPermission();
    setStatus(next);
    onPermissionChanged?.();
  };
  const actionable = status === 'not-enabled' || status === 'error';
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 border-t border-ink-700 pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium text-bone-100">Notifications</p>
        <p className="text-sm text-bone-300" aria-live="polite">
          {notificationLabel(status)}
        </p>
      </div>
      {actionable && <Button variant="secondary" className="h-11 w-full min-w-24 shrink-0 sm:w-auto" onClick={() => { void enable(); }}>Enable Notifications</Button>}
    </div>
  );
}

export function TurnAlertSettings({
  onNotificationPermissionChanged,
}: {
  onNotificationPermissionChanged?: () => void;
}) {
  const preferences = useTurnAlertPreferences();
  const disabled = !preferences.enabled;
  return (
    <section aria-labelledby="turn-alerts-heading" className="space-y-4 sm:space-y-5">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:items-center">
        <div className="min-w-0">
          <h3 id="turn-alerts-heading" className="font-display text-lg font-semibold text-bone-50">Turn Alerts</h3>
          <p className="mt-1 text-sm leading-relaxed text-bone-300">Choose whether this device is ready for turn alerts.</p>
        </div>
        <TurnAlertSwitch enabled={preferences.enabled} onChange={(enabled) => updateTurnAlertPreferences({ enabled })} />
      </div>
      <div className={disabled ? 'opacity-55' : ''}>
        <label htmlFor="turn-alert-sound" className="mb-2 block text-sm font-medium text-bone-100">Alert Sound</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <select id="turn-alert-sound" value={preferences.sound} disabled={disabled} onChange={(event) => updateTurnAlertPreferences({ sound: event.target.value as typeof preferences.sound })} className="h-11 w-full min-w-0 rounded-lg border border-ink-600 bg-ink-900 px-3 text-sm text-bone-100 focus-ring disabled:cursor-not-allowed">
            {TURN_ALERT_SOUNDS.map((sound) => <option key={sound.id} value={sound.id}>{sound.label}</option>)}
          </select>
          <Button variant="secondary" className="h-11 w-full shrink-0 sm:w-auto" disabled={disabled} onClick={() => { void playTurnAlertSound(preferences.sound); }}><Play size={15} aria-hidden="true" /> Preview</Button>
        </div>
      </div>
      <NotificationControl onPermissionChanged={onNotificationPermissionChanged} />
    </section>
  );
}

export function TurnAlertQuickControl() {
  const preferences = useTurnAlertPreferences();
  return <TurnAlertSwitch compact enabled={preferences.enabled} onChange={(enabled) => updateTurnAlertPreferences({ enabled })} />;
}
