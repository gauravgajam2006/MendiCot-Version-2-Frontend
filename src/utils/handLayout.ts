export const CARD_SIZES = {
  sm: { width: 54, height: 60 },
  md: { width: 72, height: 80 },
  lg: { width: 90, height: 100 },
} as const;

export type CardSizeToken = keyof typeof CARD_SIZES;

export interface HandSpacingResult {
  isMobileScroll: boolean;
  overlapPx: number;
  gapPx: number;
  exposedWidthPx: number;
}

export function calculateHandSpacing({
  cardCount,
  containerWidth,
  cardWidth,
  naturalGap = 8,
  minExposedWidth = 40,
  isMobile = false,
}: {
  cardCount: number;
  containerWidth: number;
  cardWidth: number;
  naturalGap?: number;
  minExposedWidth?: number;
  isMobile?: boolean;
}): HandSpacingResult {
  if (cardCount <= 1) {
    return {
      isMobileScroll: isMobile,
      overlapPx: 0,
      gapPx: 0,
      exposedWidthPx: cardWidth,
    };
  }

  // Mobile mode (< 640px): side-by-side cards in horizontal scroll container
  if (isMobile) {
    return {
      isMobileScroll: true,
      overlapPx: 0,
      gapPx: naturalGap,
      exposedWidthPx: cardWidth,
    };
  }

  // Desktop / Tablet mode (>= 640px): adaptive side-by-side / light overlap
  const idealWidth = cardCount * cardWidth + (cardCount - 1) * naturalGap;
  const effectiveWidth = Math.max(containerWidth - 32, cardWidth);

  // If available width permits, render fully side-by-side with natural gap
  if (idealWidth <= effectiveWidth) {
    return {
      isMobileScroll: false,
      overlapPx: 0,
      gapPx: naturalGap,
      exposedWidthPx: cardWidth,
    };
  }

  // Constrained width: compute adaptive step
  const availableSpread = effectiveWidth - cardWidth;
  const targetStep = Math.floor(availableSpread / (cardCount - 1));

  if (targetStep >= cardWidth) {
    // Fits side-by-side with a smaller gap than naturalGap
    const gap = targetStep - cardWidth;
    return {
      isMobileScroll: false,
      overlapPx: 0,
      gapPx: gap,
      exposedWidthPx: cardWidth,
    };
  }

  // Light overlap required
  const step = Math.max(minExposedWidth, targetStep);
  const overlapPx = cardWidth - step;

  return {
    isMobileScroll: step <= minExposedWidth && (cardWidth + (cardCount - 1) * minExposedWidth > effectiveWidth),
    overlapPx,
    gapPx: 0,
    exposedWidthPx: step,
  };
}
