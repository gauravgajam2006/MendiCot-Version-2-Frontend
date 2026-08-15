import { useEffect, useRef, useState } from 'react';
import type { PlayedCard, Player } from '@/types';
import { PlayingCard } from './PlayingCard';
import type { BackendGamePhase } from '@/api';
import type { TrickLeaderState } from '@/types';
import type { CardInspectTarget, InspectHandlers } from '@/hooks/useCardInspect';

interface CurrentTrickProps {
  cards: PlayedCard[];
  phase: BackendGamePhase;
  currentTrickLeader: TrickLeaderState | null;
  players: Player[];
  getInspectHandlers?: (target: CardInspectTarget | null) => InspectHandlers | undefined;
}

export function CurrentTrick({
  cards,
  phase,
  currentTrickLeader,
  players,
  getInspectHandlers,
}: CurrentTrickProps) {
  const isResolving = phase === 'TRICK_RESOLUTION';

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-w-0">
      {/* Played cards are intentionally the only central table content. */}
      <div className="relative flex min-h-[9rem] w-full items-center justify-center min-w-0">
        {cards.length === 0 ? (
          <div className="max-w-[14rem] px-3 text-center">
            <p className="text-sm leading-relaxed text-bone-400">
              Waiting for the first card…
            </p>
          </div>
        ) : (
          <PlayedPile
            cards={cards}
            players={players}
            winner={isResolving ? currentTrickLeader : null}
            getInspectHandlers={getInspectHandlers}
          />
        )}
      </div>
    </div>
  );
}

// Central horizontal overlapping fan. Each card is offset only horizontally
// from the previous one, so every card's top-left corner (rank + suit) stays
// exposed. The container bounds the exact group width, and the parent centers
// that container — so the visual center of the group stays stable as cards
// are added. The newest card sits on top (highest z-index).
function PlayedPile({
  cards,
  players,
  winner,
  getInspectHandlers,
}: {
  cards: PlayedCard[];
  players: Player[];
  winner: TrickLeaderState | null;
  getInspectHandlers?: (target: CardInspectTarget | null) => InspectHandlers | undefined;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(400);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = cards.length;
  // Horizontal offset in px. Each card's top-left corner (rank + suit) must
  // stay exposed, so the offset is a bit larger than the corner block.
  // Tighter for larger games so 8-card fans still fit without overflow.
  const defaultOffsetX = n <= 4 ? 34 : n <= 6 ? 26 : 20;

  const CARD_W = 72; // md width: 72px
  const CARD_H = 80; // md height: 80px (9:10 aspect ratio)

  // Adapt overlap so the pile fits within the measured container width.
  // Floor at 14px so rank + suit corner always stays visible.
  let offsetX = defaultOffsetX;
  let pileW = CARD_W + (n - 1) * offsetX;
  if (n > 1 && pileW > containerW) {
    offsetX = Math.max(14, Math.floor((containerW - CARD_W) / (n - 1)));
    pileW = CARD_W + (n - 1) * offsetX;
  }

  const latest = cards[cards.length - 1];
  const latestPlayer = players.find((p) => p.id === latest.playerId);

  return (
    <div ref={measureRef} className="flex flex-col items-center gap-2 w-full select-none">
      {/* The container width bounds the whole group; the parent centers it. */}
      <div className="relative mx-auto" style={{ width: pileW, height: CARD_H }}>
        {cards.map((pc, i) => {
          const isWinningCard = winner?.playerId === pc.playerId && winner.card.id === pc.card.id;
          return (
            <div
              key={pc.playerId}
              className={[
                'absolute top-0 animate-card-play rounded-card',
                isWinningCard ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-ink-950 z-20' : '',
              ].join(' ')}
              aria-label={isWinningCard ? `${players.find((player) => player.id === pc.playerId)?.displayName ?? 'Player'} is winning this trick` : undefined}
              style={{
                left: `${i * offsetX}px`,
                zIndex: isWinningCard ? 20 : i + 1,
              }}
            >
              <PlayingCard
                card={pc.card}
                size="md"
                state="default"
                getInspectHandlers={getInspectHandlers}
              />
            </div>
          );
        })}
      </div>
      <span className="max-w-[12rem] truncate text-2xs uppercase tracking-wider text-bone-400">
        Last by {latestPlayer?.displayName ?? 'Player'}
      </span>
      {winner && (
        <span className="text-2xs font-medium uppercase tracking-[0.12em] text-gold-300">
          Resolving trick · {winner.displayName} wins this trick
        </span>
      )}
    </div>
  );
}
