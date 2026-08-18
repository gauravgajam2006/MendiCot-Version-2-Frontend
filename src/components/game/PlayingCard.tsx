import type { Card as CardType } from '@/types';
import { SUIT_IS_RED, SUIT_SYMBOL } from '@/types';

interface PlayingCardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'playable' | 'unplayable' | 'selected' | 'face-down' | 'dimmed';
  reason?: string;
  onClick?: () => void;
  className?: string;
}

const sizeMap = {
  sm: { w: 'w-11', h: 'h-16', rank: 'text-sm', suit: 'text-xs', corner: 'text-2xs' },
  md: { w: 'w-16', h: 'h-24', rank: 'text-lg', suit: 'text-sm', corner: 'text-2xs' },
  lg: { w: 'w-20', h: 'h-28', rank: 'text-xl', suit: 'text-base', corner: 'text-xs' },
};

export function PlayingCard({
  card,
  size = 'md',
  state = 'default',
  reason,
  onClick,
  className = '',
}: PlayingCardProps) {
  const s = sizeMap[size];
  const red = SUIT_IS_RED[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];

  if (state === 'face-down') {
    return (
      <div
        className={[
          'rounded-card border border-ink-600 bg-gradient-to-b from-emerald-800 to-emerald-900 shadow-card',
          'flex items-center justify-center',
          s.w, s.h, className,
        ].join(' ')}
      >
        <div className="h-[60%] w-[70%] rounded-md border border-gold-500/30 bg-emerald-900/60 grid place-items-center">
          <span className="text-gold-500/40 text-lg font-display">✦</span>
        </div>
      </div>
    );
  }

  const interactive = onClick !== undefined && (state === 'playable' || state === 'default' || state === 'selected');
  const isUnplayable = state === 'unplayable' || state === 'dimmed';

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      title={reason}
      className={[
        'relative shrink-0 rounded-card border bg-ivory-50 shadow-card transition-all duration-200 no-tap-highlight',
        'flex flex-col justify-between p-1.5',
        s.w, s.h,
        state === 'selected'
          ? '-translate-y-3 border-emerald-500 shadow-card-lift ring-2 ring-emerald-400/50'
          : state === 'playable'
          ? 'border-emerald-500/50 hover:-translate-y-1.5 hover:border-emerald-400 hover:shadow-card-lift cursor-pointer'
          : isUnplayable
          ? 'border-ink-300/40 opacity-50 cursor-not-allowed'
          : 'border-ivory-200',
        interactive ? 'focus-ring' : '',
        className,
      ].join(' ')}
    >
      {/* Top-left corner */}
      <div className={['flex flex-col items-center leading-none self-start', red ? 'text-crimson-500' : 'text-ink-900'].join(' ')}>
        <span className={['font-semibold', s.rank].join(' ')}>{card.rank}</span>
        <span className={s.suit}>{symbol}</span>
      </div>
      {/* Center suit */}
      <div className={['absolute inset-0 grid place-items-center pointer-events-none', red ? 'text-crimson-500/80' : 'text-ink-800/70'].join(' ')}>
        <span className={['font-semibold', size === 'lg' ? 'text-3xl' : 'text-2xl'].join(' ')}>{symbol}</span>
      </div>
      {/* Bottom-right corner (rotated) */}
      <div className={['flex flex-col items-center leading-none self-end rotate-180', red ? 'text-crimson-500' : 'text-ink-900'].join(' ')}>
        <span className={['font-semibold', s.rank].join(' ')}>{card.rank}</span>
        <span className={s.suit}>{symbol}</span>
      </div>
    </button>
  );
}
