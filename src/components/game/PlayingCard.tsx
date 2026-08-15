import { useEffect, useState } from 'react';
import type { Card as CardType } from '@/types';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';
import { getCardImageUrl, getCardBackImageUrl, isMendicot48Card } from '@/utils/cardAssets';
import type { CardInspectTarget, InspectHandlers } from '@/hooks/useCardInspect';

interface PlayingCardProps {
  card: CardType;
  size?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'playable' | 'unplayable' | 'selected' | 'face-down' | 'dimmed';
  reason?: string;
  onClick?: () => void;
  className?: string;
  getInspectHandlers?: (target: CardInspectTarget | null) => InspectHandlers | undefined;
}

const sizeMap = {
  sm: { w: 'w-[54px]', h: 'h-[60px]', rank: 'text-xs', suit: 'text-[10px]', corner: 'text-[10px]' },
  md: { w: 'w-[72px]', h: 'h-[80px]', rank: 'text-base', suit: 'text-xs', corner: 'text-2xs' },
  lg: { w: 'w-[90px]', h: 'h-[100px]', rank: 'text-lg', suit: 'text-sm', corner: 'text-xs' },
};

export function PlayingCard({
  card,
  size = 'md',
  state = 'default',
  reason,
  onClick,
  className = '',
  getInspectHandlers,
}: PlayingCardProps) {
  const s = sizeMap[size];
  const red = SUIT_IS_RED[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];

  /* ── All hooks declared unconditionally ── */

  const [backImgError, setBackImgError] = useState(false);

  const useCustomFront = isMendicot48Card(card);
  const frontUrl = useCustomFront ? getCardImageUrl(card) : '';

  const [frontImgError, setFrontImgError] = useState(false);
  // Reset error state when the resolved image URL changes (new card identity).
  useEffect(() => {
    setFrontImgError(false);
  }, [frontUrl]);

  /* ── Face-down state ── */

  if (state === 'face-down') {
    const backUrl = getCardBackImageUrl();
    const inspectTarget: CardInspectTarget | null = backImgError
      ? null
      : {
          imageUrl: backUrl,
          label: 'Card Back',
          face: 'back',
        };
    const inspectHandlers = getInspectHandlers ? getInspectHandlers(inspectTarget) : undefined;

    return (
      <div
        className={[
          'rounded-card border border-ink-600 shadow-card overflow-hidden select-none',
          backImgError
            ? 'bg-gradient-to-b from-emerald-800 to-emerald-900 flex items-center justify-center'
            : '',
          s.w, s.h, className,
        ].join(' ')}
        onContextMenu={(e) => e.preventDefault()}
        {...inspectHandlers}
      >
        {backImgError ? (
          /* Baseline fallback: original CSS card back */
          <div className="h-[60%] w-[70%] rounded-md border border-gold-500/30 bg-emerald-900/60 grid place-items-center">
            <span className="text-gold-500/40 text-lg font-display">✦</span>
          </div>
        ) : (
          <img
            src={backUrl}
            alt="Card back"
            draggable={false}
            onError={() => setBackImgError(true)}
            className="pointer-events-none select-none"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}
      </div>
    );
  }

  /* ── Face-up state ── */

  const showCustomFront = useCustomFront && !frontImgError;

  const inspectTarget: CardInspectTarget | null = showCustomFront
    ? {
        imageUrl: frontUrl,
        label: `${card.rank} of ${SUIT_NAME[card.suit]}`,
        face: 'front',
      }
    : null;

  const inspectHandlers = getInspectHandlers ? getInspectHandlers(inspectTarget) : undefined;

  const interactive = onClick !== undefined && (state === 'playable' || state === 'default' || state === 'selected');
  const isUnplayable = state === 'unplayable' || state === 'dimmed';

  /* For non-interactive cards (e.g. played trick cards, unplayable cards), wrap in an inspectable container
     so that the native button remains strictly disabled while press-and-hold inspect receives pointer events */
  if (!interactive && inspectHandlers) {
    return (
      <div
        className="relative shrink-0 select-none"
        title={reason}
        onContextMenu={(e) => e.preventDefault()}
        {...inspectHandlers}
      >
        <button
          type="button"
          disabled
          aria-disabled="true"
          style={{ pointerEvents: 'none' }}
          className={[
            'relative shrink-0 rounded-card border shadow-card transition-all duration-200 no-tap-highlight overflow-hidden',
            showCustomFront ? '' : 'bg-ivory-50 flex flex-col justify-between p-1.5',
            s.w, s.h,
            isUnplayable
              ? 'border-ink-300/40 opacity-50 cursor-not-allowed'
              : showCustomFront ? 'border-ink-300/30' : 'border-ivory-200',
            className,
          ].join(' ')}
        >
          {showCustomFront ? (
            /* Custom deck artwork */
            <img
              src={frontUrl}
              alt={`${card.rank} of ${card.suit}`}
              draggable={false}
              onError={() => setFrontImgError(true)}
              className="pointer-events-none select-none"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            /* Baseline fallback: original CSS card face */
            <>
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
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={!interactive}
      title={reason}
      onContextMenu={(e) => e.preventDefault()}
      className={[
        'relative shrink-0 rounded-card border shadow-card transition-all duration-200 no-tap-highlight overflow-hidden select-none',
        showCustomFront ? '' : 'bg-ivory-50 flex flex-col justify-between p-1.5',
        s.w, s.h,
        state === 'selected'
          ? '-translate-y-3 border-emerald-500 shadow-card-lift ring-2 ring-emerald-400/50'
          : state === 'playable'
          ? 'border-emerald-500/50 hover:-translate-y-1.5 hover:border-emerald-400 hover:shadow-card-lift cursor-pointer'
          : isUnplayable
          ? 'border-ink-300/40 opacity-50 cursor-not-allowed'
          : showCustomFront ? 'border-ink-300/30' : 'border-ivory-200',
        interactive ? 'focus-ring' : '',
        className,
      ].join(' ')}
      {...inspectHandlers}
    >
      {showCustomFront ? (
        /* Custom deck artwork */
        <img
          src={frontUrl}
          alt={`${card.rank} of ${card.suit}`}
          draggable={false}
          onError={() => setFrontImgError(true)}
          className="pointer-events-none select-none"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : (
        /* Baseline fallback: original CSS card face */
        <>
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
        </>
      )}
    </button>
  );
}
