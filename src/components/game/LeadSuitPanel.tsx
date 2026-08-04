import type { Suit } from '@/types';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';

export function LeadSuitPanel({ leadSuit, compact = false }: { leadSuit: Suit | null; compact?: boolean }) {
  const suitText = leadSuit ? `${SUIT_SYMBOL[leadSuit]} ${SUIT_NAME[leadSuit]}` : 'Not set';
  return (
    <section
      aria-label="Lead suit"
      className={['surface border border-ink-700', compact ? 'w-full px-3 py-2' : 'px-3 py-2.5'].join(' ')}
    >
      <span className="label-eyebrow text-bone-400">Lead Suit</span>
      <p className={[
        'mt-1 font-display text-sm font-semibold',
        leadSuit && SUIT_IS_RED[leadSuit] ? 'text-crimson-400' : leadSuit ? 'text-bone-50' : 'text-bone-400',
      ].join(' ')}>
        {suitText}
      </p>
    </section>
  );
}
