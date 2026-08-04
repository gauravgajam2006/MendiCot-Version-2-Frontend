import type { TrickLeaderState } from '@/types';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';

interface CurrentTrickLeaderProps {
  leader: TrickLeaderState | null;
  compact?: boolean;
}

export function CurrentTrickLeader({
  leader,
  compact = false,
}: CurrentTrickLeaderProps) {
  const teamAccent = leader?.team === 'A'
    ? 'border-crimson-500/40'
    : leader?.team === 'B'
      ? 'border-gold-500/40'
      : 'border-ink-700';
  const teamDot = leader?.team === 'A'
    ? 'bg-crimson-500'
    : leader?.team === 'B'
      ? 'bg-gold-400'
      : 'bg-bone-400';

  return (
    <section
      aria-label="Current trick leader"
      aria-live="polite"
      className={[
        'surface min-w-0 overflow-hidden border',
        compact ? 'w-full px-3 py-2' : 'px-3 py-2.5',
        teamAccent,
      ].join(' ')}
    >
      <span className="label-eyebrow text-bone-400">Current Trick Leader</span>
      {leader ? (
        <div className="mt-1.5 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className={['h-2 w-2 shrink-0 rounded-full', teamDot].join(' ')} />
            <span className="min-w-0 break-words font-display text-sm font-semibold text-bone-50">
              {leader.displayName}
            </span>
          </div>
          <span
            className={[
              'shrink-0 whitespace-nowrap text-sm font-semibold',
              SUIT_IS_RED[leader.card.suit] ? 'text-crimson-400' : 'text-bone-100',
            ].join(' ')}
          >
            {leader.card.rank} {SUIT_SYMBOL[leader.card.suit]}{' '}
            <span className="font-normal">{SUIT_NAME[leader.card.suit]}</span>
          </span>
        </div>
      ) : (
        <p className="mt-1 text-xs text-bone-400">No cards played yet</p>
      )}
    </section>
  );
}
