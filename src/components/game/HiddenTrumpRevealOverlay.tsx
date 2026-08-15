import { useState } from 'react';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';
import type { Player, TrumpState } from '@/types';
import type { BackendGamePhase } from '@/api';
import { getCardBackImageUrl } from '@/utils/cardAssets';
import type { CardInspectTarget, InspectHandlers } from '@/hooks/useCardInspect';

interface HiddenTrumpRevealOverlayProps {
  phase: BackendGamePhase;
  players: Player[];
  trump: TrumpState;
  meId: string;
  trumpHiderId: string | null;
  getInspectHandlers?: (target: CardInspectTarget | null) => InspectHandlers | undefined;
}

export function HiddenTrumpRevealOverlay({
  phase,
  players,
  trump,
  meId,
  trumpHiderId,
  getInspectHandlers,
}: HiddenTrumpRevealOverlayProps) {
  const [backImgError, setBackImgError] = useState(false);

  if (phase !== 'TRUMP_REVEAL_DISPLAY' && phase !== 'HIDDEN_CARD_RETURN') {
    return null;
  }

  const isReveal = phase === 'TRUMP_REVEAL_DISPLAY';
  const isReturn = phase === 'HIDDEN_CARD_RETURN';

  const isHider = meId === trumpHiderId;
  const hiderName = players.find(p => p.id === trumpHiderId)?.displayName ?? 'Player';

  const backUrl = getCardBackImageUrl();
  const inspectTarget: CardInspectTarget | null = backImgError
    ? null
    : {
        imageUrl: backUrl,
        label: 'Card Back',
        face: 'back',
      };
  const inspectHandlers = isReturn && getInspectHandlers ? getInspectHandlers(inspectTarget) : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* TRUMP_REVEAL_DISPLAY */}
      {isReveal && trump.kind === 'revealed' && (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-ink-950/95 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-md animate-fade-in motion-safe:animate-scale-up"
          style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
          role="status"
          aria-live="polite"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-bone-400">
            TRUMP REVEALED
          </span>
          <span className={['text-2xl font-bold tracking-wider', SUIT_IS_RED[trump.suit] ? 'text-crimson-400' : 'text-bone-100'].join(' ')}>
            {SUIT_SYMBOL[trump.suit]} {SUIT_NAME[trump.suit].toUpperCase()}
          </span>
          <span className="sr-only">Trump revealed: {SUIT_NAME[trump.suit]}</span>
        </div>
      )}

      {/* HIDDEN_CARD_RETURN */}
      {isReturn && (
        <div
          className="flex flex-col items-center justify-center gap-3 animate-fade-in motion-safe:animate-translate-up"
          style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
          role="status"
          aria-live="polite"
        >
          {/* Face-down card back */}
          <div
            className={[
              'relative shrink-0 select-none',
              inspectHandlers ? 'pointer-events-auto' : '',
            ].filter(Boolean).join(' ')}
            onContextMenu={(e) => e.preventDefault()}
            {...inspectHandlers}
          >
            {backImgError ? (
              <div className="h-24 w-16 rounded-md bg-indigo-900 border-2 border-indigo-400 shadow-xl opacity-90" />
            ) : (
              <img
                src={backUrl}
                alt="Card back"
                draggable={false}
                onError={() => setBackImgError(true)}
                className="h-24 w-16 rounded-md shadow-xl opacity-90 pointer-events-none select-none"
                style={{ objectFit: 'contain' }}
              />
            )}
          </div>

          <div className="rounded-full bg-ink-950/90 px-4 py-2 ring-1 ring-white/10 backdrop-blur-md">
            <span className="text-sm font-medium text-bone-200">
               {isHider ? "Hidden card returned" : `Hidden card returned to ${hiderName}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
