import type { Suit } from '@/types';
import { capturedMendiSlots, capturedMendisDescription } from '@/utils/capturedMendis';

export function CapturedMendisSlots({
  capturedSuits = [],
  teamName,
  compact = false,
}: {
  capturedSuits?: readonly Suit[];
  teamName: string;
  compact?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={capturedMendisDescription(teamName, capturedSuits)}
      className={[
        'grid w-full max-w-full grid-cols-[repeat(4,minmax(0,1fr))] items-center justify-items-center whitespace-nowrap',
        compact ? 'gap-0.5' : 'gap-1',
      ].join(' ')}
    >
      {capturedMendiSlots(capturedSuits).map(({ suit, symbol, colorClass, captured }) => (
        <span
          key={suit}
          aria-hidden="true"
          className={[
            'inline-flex h-5 min-w-0 items-center justify-center font-display font-semibold leading-none',
            compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base',
            captured ? colorClass : 'text-bone-500 opacity-40',
          ].join(' ')}
        >
          {captured ? symbol : '·'}
        </span>
      ))}
    </div>
  );
}
