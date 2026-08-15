import { useEffect, useRef, useState } from 'react';
import type { Card } from '@/types';
import { PlayingCard } from './PlayingCard';
import type { CardInspectTarget, InspectHandlers } from '@/hooks/useCardInspect';
import { calculateHandSpacing, CARD_SIZES } from '@/utils/handLayout';

export interface CardHandProps {
  cards: Card[];
  playableIds?: Set<string>;
  selectedId?: string | null;
  onCardClick?: (card: Card) => void;
  unplayableReason?: (card: Card) => string | undefined;
  size?: 'sm' | 'md' | 'lg' | 'auto';
  compact?: boolean;
  getInspectHandlers?: (target: CardInspectTarget | null) => InspectHandlers | undefined;
  className?: string;
}

export function CardHand({
  cards,
  playableIds,
  selectedId,
  onCardClick,
  unplayableReason,
  size = 'auto',
  getInspectHandlers,
  className = '',
}: CardHandProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 640);
      }
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    handleResize();

    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        if (typeof window !== 'undefined') {
          setIsMobile(window.innerWidth < 640);
        }
      }
    });

    ro.observe(el);
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const activeSize: 'sm' | 'md' | 'lg' =
    size && size !== 'auto'
      ? size
      : isMobile
      ? 'sm'
      : containerWidth >= 1200 && cards.length <= 8
      ? 'lg'
      : 'md';

  const cardWidth = CARD_SIZES[activeSize].width;
  const naturalGap = activeSize === 'sm' ? 6 : 8;

  const spacing = calculateHandSpacing({
    cardCount: cards.length,
    containerWidth: containerWidth || (isMobile ? 375 : 1024),
    cardWidth,
    naturalGap,
    minExposedWidth: 40,
    isMobile,
  });

  return (
    <div
      ref={containerRef}
      className={['w-full max-w-full min-w-0', className].filter(Boolean).join(' ')}
    >
      {/* Contained horizontal scroll viewport with vertical headroom for selected card lift (12px) */}
      <div className="w-full max-w-full min-w-0 overflow-x-auto [scrollbar-width:thin] scrollbar-thin select-none touch-pan-x pt-4 pb-3 px-3 sm:px-4">
        {/* Inner row: centered when narrower than viewport, natural left-to-right scrolling when wider */}
        <div className="min-w-full w-max flex items-end justify-center flex-nowrap min-h-[76px] sm:min-h-[96px]">
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

            const isFirst = i === 0;
            const marginStyle = isFirst
              ? { marginLeft: 0 }
              : spacing.overlapPx > 0
              ? { marginLeft: `-${spacing.overlapPx}px` }
              : { marginLeft: `${spacing.gapPx}px` };

            return (
              <div
                key={card.id}
                className="shrink-0 transition-transform duration-200"
                style={{
                  ...marginStyle,
                  zIndex: i + 1,
                }}
              >
                <PlayingCard
                  card={card}
                  size={activeSize}
                  state={state}
                  reason={reason}
                  onClick={onCardClick ? () => onCardClick(card) : undefined}
                  getInspectHandlers={getInspectHandlers}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
