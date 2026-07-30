import { useEffect, useRef, useState } from 'react';
import type { PlayedCard, Player, Suit } from '@/types';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';
import { PlayingCard } from './PlayingCard';

interface CurrentTrickProps {
  cards: PlayedCard[];
  leadSuit: Suit | null;
  players: Player[];
  currentPlayerId: string;
  meId: string;
  trickNumber: number;
  totalTricks: number;
}

export function CurrentTrick({
  cards,
  leadSuit,
  players,
  currentPlayerId,
  meId,
  trickNumber,
  totalTricks,
}: CurrentTrickProps) {
  const playerById = (id: string) => players.find((p) => p.id === id);
  const isMyTurn = currentPlayerId === meId;

  return (
    <div className="relative flex flex-col items-center justify-center gap-3">
      {/* Trick progress + lead suit + turn indicator */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/80 px-2.5 py-1">
          <span className="label-eyebrow text-bone-400">Trick</span>
          <span className="text-2xs font-semibold tabular-nums text-bone-100">
            {trickNumber}/{totalTricks}
          </span>
        </div>
        {leadSuit && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/80 px-2.5 py-1">
            <span className="label-eyebrow text-bone-400">Lead</span>
            <span className={['font-semibold text-xs', SUIT_IS_RED[leadSuit] ? 'text-crimson-400' : 'text-bone-100'].join(' ')}>
              {SUIT_SYMBOL[leadSuit]} {SUIT_NAME[leadSuit]}
            </span>
          </div>
        )}
        <div
          className={[
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium uppercase tracking-[0.14em] transition-colors',
            isMyTurn
              ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40'
              : 'bg-ink-800 text-bone-300',
          ].join(' ')}
        >
          <span className={['h-1.5 w-1.5 rounded-full', isMyTurn ? 'bg-emerald-400 animate-pulse-soft' : 'bg-bone-400'].join(' ')} />
          {isMyTurn ? 'Your turn' : `${playerById(currentPlayerId)?.displayName ?? 'Player'}'s turn`}
        </div>
      </div>

      {/* Played cards — central controlled overlapping pile */}
      <div className="relative flex items-center justify-center min-h-[7rem] min-w-0">
        {cards.length === 0 ? (
          <div className="text-center px-2">
            <p className="text-sm text-bone-400">
              {isMyTurn ? 'Lead the trick — play any card.' : 'Waiting for the first card…'}
            </p>
          </div>
        ) : (
          <PlayedPile cards={cards} players={players} />
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
function PlayedPile({ cards, players }: { cards: PlayedCard[]; players: Player[] }) {
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

  const CARD_W = 64; // w-16
  const CARD_H = 96; // h-24

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
    <div ref={measureRef} className="flex flex-col items-center gap-2 w-full">
      {/* The container width bounds the whole group; the parent centers it. */}
      <div className="relative mx-auto" style={{ width: pileW, height: CARD_H }}>
        {cards.map((pc, i) => (
          <div
            key={pc.playerId}
            className="absolute top-0 animate-card-play"
            style={{
              left: `${i * offsetX}px`,
              zIndex: i + 1,
            }}
          >
            <PlayingCard card={pc.card} size="md" state="default" />
          </div>
        ))}
      </div>
      <span className="text-2xs text-bone-400 uppercase tracking-wider max-w-[8rem] truncate">
        {n > 1 ? `${n} cards played · ` : ''}last by {latestPlayer?.displayName ?? 'Player'}
      </span>
    </div>
  );
}
