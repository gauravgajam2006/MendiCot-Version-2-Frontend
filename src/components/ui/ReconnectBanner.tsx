import type { ReconnectState } from '@/types';
import { Loader2, WifiOff } from 'lucide-react';

export function ReconnectBanner({ state }: { state: ReconnectState }) {
  if (state === 'connected') return null;

  const isOffline = state === 'offline';

  return (
    <div
      className={[
        'fixed top-0 inset-x-0 z-[70] flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-medium animate-slide-down',
        isOffline
          ? 'bg-crimson-600/95 text-ivory-50'
          : 'bg-gold-500/95 text-ink-950',
      ].join(' ')}
      role="status"
    >
      {isOffline ? <WifiOff size={16} /> : <Loader2 size={16} className="animate-spin" />}
      <span>
        {isOffline
          ? 'Connection lost. Trying to reconnect…'
          : 'Reconnecting to the room…'}
      </span>
    </div>
  );
}
