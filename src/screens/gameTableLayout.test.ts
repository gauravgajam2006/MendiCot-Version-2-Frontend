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
