import type { TrumpState } from '@/types';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';
import { Eye, EyeOff, HelpCircle, Sparkles } from 'lucide-react';

interface TrumpStatusProps {
  trump: TrumpState;
  compact?: boolean;
}

export function TrumpStatus({ trump, compact = false }: TrumpStatusProps) {
  if (trump.kind === 'none') {
    return (
      <Shell compact={compact} label="Trump">
        <div className="flex items-center gap-2 text-bone-400">
          <HelpCircle size={compact ? 13 : 15} />
          <span className={compact ? 'text-2xs' : 'text-xs'}>No trump yet</span>
        </div>
      </Shell>
    );
  }

  if (trump.kind === 'hidden') {
    return (
      <Shell compact={compact} label="Trump" pulse accent="gold">
        <div className="flex items-center gap-2 text-gold-300">
          <EyeOff size={compact ? 13 : 15} />
          <span className={compact ? 'text-2xs' : 'text-xs'}>Hidden — waiting for reveal</span>
        </div>
      </Shell>
    );
  }

  const suit = trump.kind === 'revealed' ? trump.suit : trump.suit;
  const isCreated = trump.kind === 'created';
  const red = SUIT_IS_RED[suit];

  return (
    <Shell compact={compact} label={isCreated ? 'Trump created' : 'Trump revealed'} accent={isCreated ? 'gold' : 'emerald'}>
      <div className="flex items-center gap-2">
        {isCreated ? (
          <Sparkles size={compact ? 13 : 15} className="text-gold-400" />
        ) : (
          <Eye size={compact ? 13 : 15} className="text-emerald-400" />
        )}
        <span
          className={[
            'font-display font-semibold',
            compact ? 'text-base' : 'text-lg',
            red ? 'text-crimson-400' : 'text-bone-50',
          ].join(' ')}
        >
          {SUIT_SYMBOL[suit]}
        </span>
        <span className={['uppercase tracking-[0.14em]', 'text-2xs', red ? 'text-crimson-400' : 'text-bone-200'].join(' ')}>
          {SUIT_NAME[suit]}
        </span>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  label,
  compact,
  pulse,
  accent,
}: {
  children: React.ReactNode;
  label: string;
  compact: boolean;
  pulse?: boolean;
  accent?: 'emerald' | 'gold';
}) {
  const ring =
    accent === 'gold'
      ? 'border-gold-500/30'
      : accent === 'emerald'
      ? 'border-emerald-500/30'
      : 'border-ink-600';
  return (
    <div
      className={[
        'inline-flex flex-col gap-1 rounded-lg border bg-ink-900/80',
        compact ? 'px-2.5 py-1.5' : 'px-3 py-2',
        ring,
        pulse ? 'animate-pulse-soft' : '',
      ].join(' ')}
    >
      <span className="label-eyebrow text-bone-400">{label}</span>
      {children}
    </div>
  );
}
