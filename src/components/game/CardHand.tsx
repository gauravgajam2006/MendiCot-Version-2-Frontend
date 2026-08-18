import type { Card } from '@/types';
import { PlayingCard } from './PlayingCard';

interface CardHandProps {
  cards: Card[];
  playableIds?: Set<string>;
  selectedId?: string | null;
  onCardClick?: (card: Card) => void;
  unplayableReason?: (card: Card) => string | undefined;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

export function CardHand({
  cards,
  playableIds,
  selectedId,
  onCardClick,
  unplayableReason,
  size = 'md',
  compact = false,
}: CardHandProps) {
  // Responsive overlap: tight fan on phones, looser as space allows.
  // Keeps the full hand inside the viewport without horizontal page scroll.
  const overlap = compact
    ? '-ml-11 sm:-ml-8 md:-ml-7'
    : size === 'lg'
    ? '-ml-7 sm:-ml-8 md:-ml-9'
    : '-ml-8 md:-ml-7';

  return (
    <div className="flex items-end justify-center px-1 min-w-0">
      {cards.map((card, i) => {
        const playable = playableIds?.has(card.id);
        const selected = selectedId === card.id;
        const state = selected
          ? 'selected'
          : playableIds && !playable
          ? 'unplayable'
          : playable
          ? 'playable'
          : 'default';
        const reason = state === 'unplayable' && unplayableReason ? unplayableReason(card) : undefined;
        return (
          <div key={card.id} className={[i === 0 ? '' : overlap, 'shrink-0'].join(' ')} style={{ zIndex: i }}>
            <PlayingCard
              card={card}
              size={size}
              state={state}
              reason={reason}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
