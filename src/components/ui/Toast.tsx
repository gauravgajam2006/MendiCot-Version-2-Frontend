import { type ToastMessage } from '@/types';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const kindConfig = {
  error: { icon: XCircle, color: 'text-crimson-400', ring: 'border-crimson-500/30' },
  warning: { icon: AlertTriangle, color: 'text-gold-400', ring: 'border-gold-500/30' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', ring: 'border-emerald-500/30' },
  info: { icon: Info, color: 'text-bone-200', ring: 'border-ink-600' },
} as const;

export function Toast({ toast, onDismiss }: ToastProps) {
  const cfg = kindConfig[toast.kind];
  const Icon = cfg.icon;
  return (
    <div
      className={[
        'pointer-events-auto flex items-start gap-3 surface-raised border px-4 py-3 shadow-card-lift animate-slide-up max-w-sm w-full',
        cfg.ring,
      ].join(' ')}
      role="status"
    >
      <Icon size={18} className={['mt-0.5 shrink-0', cfg.color].join(' ')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-bone-50">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-bone-300 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="text-bone-400 hover:text-bone-100 transition-colors text-xs"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function InlineMessage({
  kind,
  title,
  children,
}: {
  kind: 'error' | 'warning' | 'info';
  title: string;
  children?: ReactNode;
}) {
  const cfg = kindConfig[kind === 'info' ? 'info' : kind];
  const Icon = cfg.icon;
  return (
    <div
      className={[
        'flex items-start gap-2.5 rounded-lg border bg-ink-900 px-3.5 py-2.5',
        cfg.ring,
      ].join(' ')}
    >
      <Icon size={16} className={['mt-0.5 shrink-0', cfg.color].join(' ')} />
      <div className="min-w-0">
        <p className={['text-sm font-medium', cfg.color].join(' ')}>{title}</p>
        {children && (
          <p className="mt-0.5 text-xs text-bone-300 leading-relaxed">{children}</p>
        )}
      </div>
    </div>
  );
}
