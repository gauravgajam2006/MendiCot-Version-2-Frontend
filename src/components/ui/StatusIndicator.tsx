import type { ConnectionStatus } from '@/types';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const config = {
  online: { dot: 'bg-emerald-400', text: 'text-emerald-300', label: 'Online' },
  offline: { dot: 'bg-bone-500', text: 'text-bone-400', label: 'Offline' },
  connecting: { dot: 'bg-gold-400 animate-pulse-soft', text: 'text-gold-300', label: 'Connecting' },
} as const;

export function StatusIndicator({
  status,
  label,
  size = 'sm',
}: StatusIndicatorProps) {
  const cfg = config[status];
  const dot = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const text = size === 'sm' ? 'text-2xs' : 'text-xs';
  return (
    <span className={['inline-flex items-center gap-1.5', cfg.text, text].join(' ')}>
      <span className={['rounded-full', dot, cfg.dot].join(' ')} />
      {label ?? cfg.label}
    </span>
  );
}
