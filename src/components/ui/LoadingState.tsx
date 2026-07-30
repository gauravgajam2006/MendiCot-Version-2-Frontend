import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  title?: string;
  description?: string;
  children?: ReactNode;
}

export function LoadingState({
  title = 'Loading',
  description,
  children,
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-fade-in">
      <div className="relative">
        <div className="h-10 w-10 rounded-full border-2 border-ink-600 border-t-emerald-400 animate-spin" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-bone-50">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-bone-300 max-w-xs">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function InlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-bone-300 text-sm">
      <Loader2 size={14} className="animate-spin" />
      {label ?? 'Loading…'}
    </span>
  );
}
