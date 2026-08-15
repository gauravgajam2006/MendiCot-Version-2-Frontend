import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const table = readFileSync(new URL('./GameTablePage.tsx', import.meta.url), 'utf8');
const trick = readFileSync(new URL('../components/game/CurrentTrick.tsx', import.meta.url), 'utf8');
const lead = readFileSync(new URL('../components/game/LeadSuitPanel.tsx', import.meta.url), 'utf8');
const seat = readFileSync(new URL('../components/game/PlayerSeat.tsx', import.meta.url), 'utf8');

test('desktop trick and turn badges are table-corner status elements, not center content', () => {
  assert.match(table, /absolute left-3 top-3 z-20 hidden lg:block/);
  assert.match(table, /absolute right-3 top-3 z-20 hidden lg:block/);
  assert.match(table, /<TrickBadge trickNumber=\{trickNumber\} totalTricks=\{totalTricks\} \/>/);
  assert.match(table, /<TurnBadge currentPlayerId=\{trick\.currentPlayerId\}/);
  assert.equal(trick.includes('TrickBadge'), false);
  assert.equal(trick.includes('TurnBadge'), false);
});

test('lead suit is a sidebar panel between leader and trump without a duplicate Mendi panel', () => {
  const leaderIndex = table.indexOf('<CurrentTrickLeader leader={currentTrickLeader} />');
  const leadIndex = table.indexOf('<LeadSuitPanel leadSuit={trick.leadSuit} />');
  const trumpIndex = table.indexOf('<TrumpStatus trump={trump} />');
  assert.ok(leaderIndex >= 0 && leaderIndex < leadIndex && leadIndex < trumpIndex);
  assert.equal(table.includes('CapturedTensPanel'), false);
  assert.equal(table.includes('Captured Tens (Mendis)'), false);
  assert.match(lead, /aria-label="Lead suit"/);
  assert.match(lead, /Lead Suit/);
  assert.match(lead, /Not set/);
});

test('mobile status stays above the side-seat row with a compact one-line lead row', () => {
  assert.match(table, /lg:hidden relative z-10 px-2 pt-2/);
  assert.match(table, /<MobileTableStatus/);
  assert.match(table, /flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-1/);
  assert.match(table, /basis-full items-center justify-center gap-1\.5 whitespace-nowrap/);
  assert.match(table, /Lead:<\/span>/);
  assert.match(table, /aria-label="Current trick status"/);
});

test('the center contains only cards, latest-player text, empty state, and resolution winner state', () => {
  assert.match(trick, /Waiting for the first card…/);
  assert.match(trick, /Last by/);
  assert.match(trick, /wins this trick/);
  assert.equal(trick.includes('Lead</span>'), false);
  assert.equal(trick.includes('Your turn'), false);
  assert.equal(trick.includes('{trickNumber}'), false);
});

test('4, 6, and 8 player table sizing remains responsive without overflow-oriented center stacks', () => {
  assert.match(table, /playerCount >= 8/);
  assert.match(table, /min-h-\[34rem\]/);
  assert.match(table, /playerCount === 6/);
  assert.match(table, /min-h-\[30rem\]/);
  assert.match(table, /min-h-\[26rem\]/);
  assert.match(table, /min-w-0/);
  assert.match(table, /flex-wrap/);
});

test('mobile side seats use a separate edge row and cards keep a reserved lower area', () => {
  assert.match(table, /Mobile: side seats occupy a dedicated upper row/);
  assert.match(table, /lg:hidden relative z-10 flex-1 min-h-\[18rem\] px-2/);
  assert.match(table, /absolute left-1 top-3 z-10 flex max-w-\[46%\]/);
  assert.match(table, /absolute right-1 top-3 z-10 flex max-w-\[46%\]/);
  assert.match(table, /items-end justify-center pb-2 pt-28/);
  assert.match(table, /hidden flex-1 items-center justify-between.*lg:flex/s);
});

test('game-table player seats omit team-name text while retaining team-driven avatar styling', () => {
  assert.equal(seat.includes('Team Maroon'), false);
  assert.equal(seat.includes('Team Gold'), false);
  assert.match(seat, /team=\{player\.team\}/);
  assert.match(seat, /isCurrentTurn/);
  assert.match(seat, /cardsRemaining/);
});

test('center waiting and resolution text use safe mobile widths', () => {
  assert.match(trick, /max-w-\[14rem\] px-3 text-center/);
  assert.match(trick, /leading-relaxed/);
  assert.match(trick, /min-h-\[9rem\] w-full/);
  assert.match(trick, /Resolving trick ·/);
});

const overlay = readFileSync(new URL('../components/game/HiddenTrumpRevealOverlay.tsx', import.meta.url), 'utf8');

test('HiddenTrumpRevealOverlay renders exact visible strings and animations', () => {
  assert.match(overlay, /TRUMP REVEALED/);
  assert.match(overlay, /Hidden card returned/);
  assert.match(overlay, /Hidden card returned to \$\{hiderName\}/);
  assert.match(overlay, /animate-fade-in motion-safe:animate-scale-up/);
  assert.match(overlay, /animate-fade-in motion-safe:animate-translate-up/);
  assert.match(overlay, /cubic-bezier\(0\.22, 1, 0\.36, 1\)/);
  assert.match(overlay, /cubic-bezier\(0\.4, 0, 0\.2, 1\)/);
  assert.match(overlay, /pointer-events-none/);
});

test('HiddenTrumpRevealOverlay uses accessibility labels without exposing rank', () => {
  assert.match(overlay, /aria-live="polite"/);
  assert.match(overlay, /sr-only">Trump revealed:/);
  assert.equal(overlay.includes('trump.hiddenRank'), false);
  assert.equal(overlay.includes('trump.rank'), false);
});

const inspectHook = readFileSync(new URL('../hooks/useCardInspect.ts', import.meta.url), 'utf8');
const inspectOverlay = readFileSync(new URL('../components/game/CardInspectOverlay.tsx', import.meta.url), 'utf8');
const playingCard = readFileSync(new URL('../components/game/PlayingCard.tsx', import.meta.url), 'utf8');

test('useCardInspect uses locked 450ms hold delay and 12px movement threshold', () => {
  assert.match(inspectHook, /HOLD_DURATION_MS = 450/);
  assert.match(inspectHook, /MOVEMENT_THRESHOLD_PX = 12/);
  assert.match(inspectHook, /dx \* dx \+ dy \* dy > MOVEMENT_THRESHOLD_PX \* MOVEMENT_THRESHOLD_PX/);
  assert.match(inspectHook, /onClickCapture/);
  assert.match(inspectHook, /stopPropagation/);
  assert.match(inspectHook, /preventDefault/);
});

test('CardInspectOverlay conforms to locked viewport constraints, 9:10 ratio and accessibility', () => {
  assert.match(inspectOverlay, /z-\[9999\]/);
  assert.match(inspectOverlay, /pointer-events-none/);
  assert.match(inspectOverlay, /min\(90vw, 450px\)/);
  assert.match(inspectOverlay, /82vh/);
  assert.match(inspectOverlay, /aspectRatio:\s*'9 \/ 10'/);
  assert.match(inspectOverlay, /objectFit:\s*'contain'/);
  assert.match(inspectOverlay, /e\.key === 'Escape'/);
});

test('PlayingCard preserves disabled semantics for non-interactive cards and guards face-down privacy', () => {
  // Face-down cards only expose 'Card Back' and never rank/suit
  assert.match(playingCard, /label:\s*'Card Back'/);
  assert.match(playingCard, /face:\s*'back'/);
  // Non-interactive cards wrap a disabled button without converting it into an active button
  assert.match(playingCard, /!interactive && inspectHandlers/);
  assert.match(playingCard, /disabled/);
  assert.match(playingCard, /pointerEvents:\s*'none'/);
  // Custom front failure respects fallback
  assert.match(playingCard, /showCustomFront \?/);
});

test('GameTablePage wires CardInspectOverlay and per-card inspect handlers without global containerRef', () => {
  assert.match(table, /useCardInspect/);
  assert.match(table, /CardInspectOverlay target=\{inspectedTarget\}/);
  assert.match(table, /getInspectHandlers=\{getInspectHandlers\}/);
  assert.match(table, /<HiddenTrumpRevealOverlay[\s\S]*?getInspectHandlers=\{getInspectHandlers\}/);
  assert.equal(table.includes('containerRef'), false);
});

test('onPointerCancel safely disarms hold, closes preview, and clears click suppression', () => {
  assert.match(inspectHook, /onPointerCancel = \(\) => \{/);
  assert.match(inspectHook, /releasePointerCapture/);
  assert.match(inspectHook, /setInspectedTarget\(null\)/);
  assert.match(inspectHook, /suppressNextClickRef\.current = false/);
  assert.match(inspectHook, /targetElementRef\.current = null/);
});

test('post-long-press click suppression applies strictly to the held card target and not unrelated cards', () => {
  assert.match(inspectHook, /targetElementRef\.current === e\.currentTarget/);

  // Pure logic state transition verification
  let suppressNextClick = false;
  let heldElement: unknown = null;

  const triggerHold = (el: unknown) => {
    suppressNextClick = true;
    heldElement = el;
  };

  const handlePointerCancel = () => {
    suppressNextClick = false;
    heldElement = null;
  };

  const handlePointerUp = () => {
    // Keep suppression armed for the same target
  };

  const handleClickCapture = (el: unknown): boolean => {
    if (suppressNextClick && heldElement === el) {
      suppressNextClick = false;
      heldElement = null;
      return true; // suppressed
    }
    return false; // not suppressed
  };

  const cardA = { id: 'cardA' };
  const cardB = { id: 'cardB' };

  // Case 1: Hold card A -> pointercancel -> later click on card B is NOT suppressed
  triggerHold(cardA);
  handlePointerCancel();
  assert.equal(handleClickCapture(cardB), false);

  // Case 2: Hold card A -> pointerup -> click on card A is suppressed -> click on card B is NOT suppressed
  triggerHold(cardA);
  handlePointerUp();
  assert.equal(handleClickCapture(cardA), true);
  assert.equal(handleClickCapture(cardB), false);
});

/* ── Phase 4: Responsive Hand Layout Tests ── */

const cardHandSource = readFileSync(new URL('../components/game/CardHand.tsx', import.meta.url), 'utf8');
const { calculateHandSpacing, CARD_SIZES } = await import('../utils/handLayout.ts');

test('PlayingCard display size tokens strictly conform to 9:10 aspect ratio', () => {
  assert.equal(CARD_SIZES.sm.width / CARD_SIZES.sm.height, 0.9);
  assert.equal(CARD_SIZES.md.width / CARD_SIZES.md.height, 0.9);
  assert.equal(CARD_SIZES.lg.width / CARD_SIZES.lg.height, 0.9);
  assert.deepEqual(CARD_SIZES.sm, { width: 54, height: 60 });
  assert.deepEqual(CARD_SIZES.md, { width: 72, height: 80 });
  assert.deepEqual(CARD_SIZES.lg, { width: 90, height: 100 });

  assert.match(playingCard, /w-\[54px\]/);
  assert.match(playingCard, /h-\[60px\]/);
  assert.match(playingCard, /w-\[72px\]/);
  assert.match(playingCard, /h-\[80px\]/);
  assert.match(playingCard, /w-\[90px\]/);
  assert.match(playingCard, /h-\[100px\]/);
});

test('CurrentTrick renders played cards in a centered horizontal fan pile with adaptive offset and winner ring', () => {
  assert.match(trick, /PlayedPile/);
  assert.match(trick, /ResizeObserver/);
  assert.match(trick, /ring-gold-400/);
  assert.match(trick, /defaultOffsetX = n <= 4 \? 34 : n <= 6 \? 26 : 20/);
  assert.match(trick, /CARD_W = 72/);
  assert.match(trick, /CARD_H = 80/);
  assert.equal(trick.includes('SeatBasedTrickArena'), false);
  assert.equal(trick.includes('resolvePlayerTrickSlot'), false);
});

test('calculateHandSpacing produces side-by-side layout on desktop with ample width', () => {
  // Desktop 1920px (container width ~1152px), 12 cards, md width (72px)
  const result12 = calculateHandSpacing({
    cardCount: 12,
    containerWidth: 1152,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(result12.isMobileScroll, false);
  assert.equal(result12.overlapPx, 0);
  assert.equal(result12.gapPx, 8);
  assert.equal(result12.exposedWidthPx, 72);

  // 8 cards (6-player) on desktop
  const result8 = calculateHandSpacing({
    cardCount: 8,
    containerWidth: 1152,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(result8.isMobileScroll, false);
  assert.equal(result8.overlapPx, 0);
  assert.equal(result8.gapPx, 8);

  // 6 cards (8-player) on desktop
  const result6 = calculateHandSpacing({
    cardCount: 6,
    containerWidth: 1152,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(result6.isMobileScroll, false);
  assert.equal(result6.overlapPx, 0);
  assert.equal(result6.gapPx, 8);
});

test('calculateHandSpacing applies light adaptive overlap on tablet portrait and relaxes as hand depletes', () => {
  const containerWidth = 768; // 768px tablet portrait (effective width = 736px)

  // 12 cards on 768px: ideal width = 12 * 72 + 11 * 8 = 952px > 736px
  // available spread = 736 - 72 = 664px -> target step = floor(664 / 11) = 60px
  // overlap = 72 - 60 = 12px -> exposed width = 60px (83.3% of card visible)
  const hand12 = calculateHandSpacing({
    cardCount: 12,
    containerWidth,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(hand12.isMobileScroll, false);
  assert.equal(hand12.overlapPx, 12);
  assert.equal(hand12.gapPx, 0);
  assert.equal(hand12.exposedWidthPx, 60);

  // Depleted to 10 cards: available spread = 664px -> target step = floor(664 / 9) = 73px >= 72px
  // Ideal width for 10 cards = 10 * 72 + 9 * 8 = 792px > 736px -> step = floor(664/9) = 73 -> clamped to 72 -> overlap = 0!
  const hand10 = calculateHandSpacing({
    cardCount: 10,
    containerWidth,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(hand10.isMobileScroll, false);
  assert.equal(hand10.overlapPx, 0);
  assert.equal(hand10.exposedWidthPx, 72);

  // Depleted to 8 cards: ideal width = 8 * 72 + 7 * 8 = 632px <= 736px -> full side-by-side with 8px gap
  const hand8 = calculateHandSpacing({
    cardCount: 8,
    containerWidth,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(hand8.isMobileScroll, false);
  assert.equal(hand8.overlapPx, 0);
  assert.equal(hand8.gapPx, 8);
  assert.equal(hand8.exposedWidthPx, 72);

  // Depleted to 4 cards
  const hand4 = calculateHandSpacing({
    cardCount: 4,
    containerWidth,
    cardWidth: 72,
    naturalGap: 8,
    isMobile: false,
  });
  assert.equal(hand4.isMobileScroll, false);
  assert.equal(hand4.overlapPx, 0);
  assert.equal(hand4.gapPx, 8);
  assert.equal(hand4.exposedWidthPx, 72);
});

test('calculateHandSpacing enforces minimum exposed card width floor', () => {
  // Constrained width with many cards
  const result = calculateHandSpacing({
    cardCount: 12,
    containerWidth: 400,
    cardWidth: 72,
    minExposedWidth: 40,
    isMobile: false,
  });
  assert.equal(result.exposedWidthPx, 40);
  assert.equal(result.overlapPx, 32); // 72 - 40
  assert.equal(result.isMobileScroll, true); // Exceeds effective width, activates scroll fallback
});

test('calculateHandSpacing activates contained scroll mode for mobile viewports (< 640px)', () => {
  const mobileWidths = [320, 375, 390, 414, 430];

  for (const width of mobileWidths) {
    const result = calculateHandSpacing({
      cardCount: 12,
      containerWidth: width,
      cardWidth: 54,
      naturalGap: 6,
      isMobile: true,
    });
    assert.equal(result.isMobileScroll, true);
    assert.equal(result.overlapPx, 0); // No negative overlap
    assert.equal(result.gapPx, 6); // Positive natural gap
    assert.equal(result.exposedWidthPx, 54);
  }
});

test('CardHand component adheres to scroll containment, headroom, reachability, and flex-nowrap constraints', () => {
  // Contained horizontal scroll viewport
  assert.match(cardHandSource, /overflow-x-auto/);
  assert.match(cardHandSource, /scrollbar-thin/);
  assert.match(cardHandSource, /touch-pan-x/);

  // Sufficient internal vertical headroom for selected lift (12px) + ring + shadow
  assert.match(cardHandSource, /pt-4\s+pb-3/);

  // Inner row structure: min-w-full and w-max for centering when short, reachability when long
  assert.match(cardHandSource, /min-w-full\s+w-max/);
  assert.match(cardHandSource, /flex-nowrap/);
  assert.match(cardHandSource, /justify-center/);

  // Padding so first and last cards stay reachable
  assert.match(cardHandSource, /px-3\s+sm:px-4/);
});
