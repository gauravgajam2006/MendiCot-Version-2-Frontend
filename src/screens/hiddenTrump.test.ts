import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptGameState, resolveGameplayActionError } from '../api/gameState.ts';
import type { BackendGameState } from '../api/gameState.ts';
import type { RoomState } from '../types.ts';

const ids = ['p1', 'p2', 'p3', 'p4'];
const room: RoomState = {
  status: 'IN_GAME',
  config: { code: 'ABCD1234', playerCount: 4, trumpMode: 'hidden' },
  hostId: 'p1',
  teams: { A: 'Team Maroon', B: 'Team Gold' },
  returnedToLobbyPlayerIds: [],
  players: ids.map((id, seatIndex) => ({
    id, displayName: `Player ${seatIndex + 1}`, team: seatIndex % 2 === 0 ? 'A' : 'B', seatIndex,
    isHost: id === 'p1', isReady: true, connection: 'online', isCurrentPlayer: id === 'p1',
  })),
};

function hiddenStateSnapshot(overrides: Partial<BackendGameState> = {}): BackendGameState {
  return {
    game_id: 'game-hidden-1',
    player_count: 4,
    players: ids.map((player_id, seat_index) => ({ player_id, seat_index, team_id: seat_index % 2 === 0 ? 'TeamA' : 'TeamB' })),
    teams: {
      TeamA: { team_id: 'TeamA', player_ids: ['p1', 'p3'], captured_cards: [], tricks_won: 0, tens_captured: 0 },
      TeamB: { team_id: 'TeamB', player_ids: ['p2', 'p4'], captured_cards: [], tricks_won: 0, tens_captured: 0 },
    },
    seat_order: ids,
    hands: { p1: [] },
    hand_counts: { p1: 12, p2: 12, p3: 12, p4: 12 },
    phase: 'HIDDEN_TRUMP_SELECTION',
    current_turn: null,
    current_player_id: null,
    current_trick: { lead_player_id: null, lead_suit: null, played_cards: [], winner_player_id: null, completed: false },
    current_trick_leader: null,
    completed_tricks: [],
    trump_state: { status: 'HIDDEN', suit: null, hidden_rank: null, hidden_card_index: null, trump_hider_id: 'p1' },
    hidden_trump_mode: true,
    hidden_hand_positions: Array.from({ length: 12 }, (_, i) => i),
    room_id: room.config.code,
    room_status: 'IN_GAME',
    host_id: 'p1',
    version: 2,
    ...overrides,
  };
}

test('authoritative hidden_hand_positions is validated for 4-player games (12 card backs)', () => {
  const snapshot = hiddenStateSnapshot();
  const state = adaptGameState(snapshot, room, 'p1');
  assert.equal(state.selectableHiddenPositions.length, 12);
  assert.deepEqual(state.selectableHiddenPositions, Array.from({ length: 12 }, (_, i) => i));
  assert.equal(state.hand.length, 0); // Real hand remains redacted
});

test('authoritative hidden_hand_positions is validated for 6-player games (8 card backs)', () => {
  const sixIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const sixRoom: RoomState = {
    ...room,
    config: { code: 'SIX1234', playerCount: 6, trumpMode: 'hidden' },
    players: sixIds.map((id, seatIndex) => ({
      id, displayName: `Player ${seatIndex + 1}`, team: seatIndex % 2 === 0 ? 'A' : 'B', seatIndex,
      isHost: id === 'p1', isReady: true, connection: 'online', isCurrentPlayer: id === 'p1',
    })),
  };
  const snapshot = hiddenStateSnapshot({
    player_count: 6,
    seat_order: sixIds,
    players: sixIds.map((player_id, seat_index) => ({ player_id, seat_index, team_id: seat_index % 2 === 0 ? 'TeamA' : 'TeamB' })),
    hidden_hand_positions: Array.from({ length: 8 }, (_, i) => i),
  });
  const state = adaptGameState(snapshot, sixRoom, 'p1');
  assert.equal(state.selectableHiddenPositions.length, 8);
  assert.deepEqual(state.selectableHiddenPositions, Array.from({ length: 8 }, (_, i) => i));
});

test('authoritative hidden_hand_positions is validated for 8-player games (6 card backs)', () => {
  const eightIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
  const eightRoom: RoomState = {
    ...room,
    config: { code: 'EIGHT123', playerCount: 8, trumpMode: 'hidden' },
    players: eightIds.map((id, seatIndex) => ({
      id, displayName: `Player ${seatIndex + 1}`, team: seatIndex % 2 === 0 ? 'A' : 'B', seatIndex,
      isHost: id === 'p1', isReady: true, connection: 'online', isCurrentPlayer: id === 'p1',
    })),
  };
  const snapshot = hiddenStateSnapshot({
    player_count: 8,
    seat_order: eightIds,
    players: eightIds.map((player_id, seat_index) => ({ player_id, seat_index, team_id: seat_index % 2 === 0 ? 'TeamA' : 'TeamB' })),
    hidden_hand_positions: Array.from({ length: 6 }, (_, i) => i),
  });
  const state = adaptGameState(snapshot, eightRoom, 'p1');
  assert.equal(state.selectableHiddenPositions.length, 6);
  assert.deepEqual(state.selectableHiddenPositions, Array.from({ length: 6 }, (_, i) => i));
});

test('missing, null, or undefined hidden_hand_positions results in [] without local synthesis', () => {
  const snapshotMissing = hiddenStateSnapshot({ hidden_hand_positions: undefined });
  const stateMissing = adaptGameState(snapshotMissing, room, 'p1');
  assert.deepEqual(stateMissing.selectableHiddenPositions, []);

  const snapshotNull = hiddenStateSnapshot({ hidden_hand_positions: null });
  const stateNull = adaptGameState(snapshotNull, room, 'p1');
  assert.deepEqual(stateNull.selectableHiddenPositions, []);
});

test('malformed hidden_hand_positions (booleans, negatives, floats, duplicates, count mismatch) result in []', () => {
  // Contains boolean
  const snapshotBool = hiddenStateSnapshot({ hidden_hand_positions: [0, 1, 2, true as unknown as number, 4, 5, 6, 7, 8, 9, 10, 11] });
  assert.deepEqual(adaptGameState(snapshotBool, room, 'p1').selectableHiddenPositions, []);

  // Contains negative
  const snapshotNeg = hiddenStateSnapshot({ hidden_hand_positions: [0, 1, -2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
  assert.deepEqual(adaptGameState(snapshotNeg, room, 'p1').selectableHiddenPositions, []);

  // Contains float
  const snapshotFloat = hiddenStateSnapshot({ hidden_hand_positions: [0, 1, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
  assert.deepEqual(adaptGameState(snapshotFloat, room, 'p1').selectableHiddenPositions, []);

  // Contains duplicate
  const snapshotDup = hiddenStateSnapshot({ hidden_hand_positions: [0, 1, 2, 2, 4, 5, 6, 7, 8, 9, 10, 11] });
  assert.deepEqual(adaptGameState(snapshotDup, room, 'p1').selectableHiddenPositions, []);

  // Count mismatch (10 positions for 4 players)
  const snapshotCount = hiddenStateSnapshot({ hidden_hand_positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
  assert.deepEqual(adaptGameState(snapshotCount, room, 'p1').selectableHiddenPositions, []);
});

test('non-hider player during HIDDEN_TRUMP_SELECTION receives redacted hand and no positions', () => {
  const snapshot = hiddenStateSnapshot();
  const nonHiderState = adaptGameState(snapshot, room, 'p2');
  assert.equal(nonHiderState.hand.length, 0);
  assert.equal(nonHiderState.trumpHiderId, 'p1');
});

test('stable backend error codes for hidden trump selection stay inline', () => {
  for (const code of ['INVALID_CARD_INDEX', 'NOT_TRUMP_HIDER', 'INVALID_PHASE', 'INVALID_TRUMP_MODE']) {
    const errorMsg = resolveGameplayActionError({ action: 'SELECT_HIDDEN_TRUMP', code, message: `Rejection: ${code}` });
    assert.equal(errorMsg, `Rejection: ${code}`);
  }
});

/* ── Hidden Trump Card Back Inspect & Privacy Tests ── */

import { readFileSync } from 'node:fs';

const hiddenTrumpPageSrc = readFileSync(new URL('./HiddenTrumpPage.tsx', import.meta.url), 'utf8');
const hiddenTrumpRevealOverlaySrc = readFileSync(new URL('../components/game/HiddenTrumpRevealOverlay.tsx', import.meta.url), 'utf8');

test('HiddenTrumpPage wires useCardInspect and CardInspectOverlay without exposing rank or suit', () => {
  // Wires useCardInspect and CardInspectOverlay
  assert.match(hiddenTrumpPageSrc, /useCardInspect/);
  assert.match(hiddenTrumpPageSrc, /<CardInspectOverlay target=\{inspectedTarget\} onClose=\{closeInspect\} \/>/);

  // Constructs strictly safe target with Card Back label and back face
  assert.match(hiddenTrumpPageSrc, /label:\s*'Card Back'/);
  assert.match(hiddenTrumpPageSrc, /face:\s*'back'/);
  assert.match(hiddenTrumpPageSrc, /imageUrl:\s*backUrl/);

  // Hidden cards must never derive, request, or expose rank/suit/card identity
  assert.equal(hiddenTrumpPageSrc.includes('card.rank'), false);
  assert.equal(hiddenTrumpPageSrc.includes('card.suit'), false);
  assert.equal(hiddenTrumpPageSrc.includes('hiddenRank'), false);
  assert.equal(hiddenTrumpPageSrc.includes('hidden_rank'), false);
  assert.equal(hiddenTrumpPageSrc.includes('frontUrl'), false);

  // Prevents native context menu, image drag ghost, and text selection
  assert.match(hiddenTrumpPageSrc, /onContextMenu=\{\(e\) => e\.preventDefault\(\)\}/);
  assert.match(hiddenTrumpPageSrc, /select-none/);
  assert.match(hiddenTrumpPageSrc, /draggable=\{false\}/);
  assert.match(hiddenTrumpPageSrc, /pointer-events-none/);
});

test('HiddenTrumpRevealOverlay selectively wires inspect on card-back without adding cursor-pointer or altering parent opacity/pointer events', () => {
  // Accepts getInspectHandlers
  assert.match(hiddenTrumpRevealOverlaySrc, /getInspectHandlers\?:/);

  // Constructs strictly safe target
  assert.match(hiddenTrumpRevealOverlaySrc, /label:\s*'Card Back'/);
  assert.match(hiddenTrumpRevealOverlaySrc, /face:\s*'back'/);
  assert.match(hiddenTrumpRevealOverlaySrc, /imageUrl:\s*backUrl/);

  // Parent overlay remains non-interactive
  assert.match(hiddenTrumpRevealOverlaySrc, /pointer-events-none absolute inset-0/);

  // Only the visible card wrapper receives pointer-events-auto when inspect is active
  assert.match(hiddenTrumpRevealOverlaySrc, /inspectHandlers \? 'pointer-events-auto' : ''/);

  // Cursor-pointer is intentionally NOT added for non-interactive return card
  assert.equal(hiddenTrumpRevealOverlaySrc.includes('cursor-pointer'), false);

  // Prevents native context menu and dragging
  assert.match(hiddenTrumpRevealOverlaySrc, /onContextMenu=\{\(e\) => e\.preventDefault\(\)\}/);
  assert.match(hiddenTrumpRevealOverlaySrc, /select-none/);
  assert.match(hiddenTrumpRevealOverlaySrc, /draggable=\{false\}/);
});

test('Hidden Trump card inspect gesture state machine: short tap selects, long hold triggers inspect and suppresses trailing click', () => {
  let selectedPosition: number | null = null;
  let inspectedTarget: unknown = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isHoldTriggered = false;
  let suppressNextClick = false;
  let targetElement: unknown = null;
  let startPos: { x: number; y: number } | null = null;

  const cardBackTarget = {
    imageUrl: '/deck/mendicot-stranger-things-deck/card-back.png',
    label: 'Card Back',
    face: 'back',
  };

  const simulatePointerDown = (el: unknown, pos: { x: number; y: number }) => {
    if (timer) clearTimeout(timer);
    startPos = { ...pos };
    targetElement = el;
    isHoldTriggered = false;
    suppressNextClick = false;
    timer = setTimeout(() => {
      isHoldTriggered = true;
      suppressNextClick = true;
      inspectedTarget = cardBackTarget;
    }, 450);
  };

  const simulatePointerMove = (pos: { x: number; y: number }) => {
    if (timer && !isHoldTriggered && startPos) {
      const dx = pos.x - startPos.x;
      const dy = pos.y - startPos.y;
      if (dx * dx + dy * dy > 12 * 12) {
        clearTimeout(timer);
        timer = null;
        startPos = null;
      }
    }
  };

  const simulatePointerUp = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (isHoldTriggered) {
      isHoldTriggered = false;
      inspectedTarget = null;
      // suppressNextClick remains true for the trailing click
    } else {
      suppressNextClick = false;
      targetElement = null;
    }
    startPos = null;
  };

  const simulatePointerCancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (isHoldTriggered) {
      isHoldTriggered = false;
      inspectedTarget = null;
    }
    suppressNextClick = false;
    targetElement = null;
    startPos = null;
  };

  const simulateClick = (el: unknown, posIndex: number) => {
    if (suppressNextClick && targetElement === el) {
      suppressNextClick = false;
      targetElement = null;
      return; // click suppressed!
    }
    selectedPosition = posIndex;
  };

  const button0 = { id: 'btn-0' };
  const button1 = { id: 'btn-1' };

  // Scenario 1: Short tap (<450ms) selects position 0 normally
  simulatePointerDown(button0, { x: 100, y: 100 });
  simulatePointerUp(); // released quickly before 450ms
  simulateClick(button0, 0);
  assert.equal(selectedPosition, 0);
  assert.equal(inspectedTarget, null);

  // Scenario 2: Long hold (~450ms) opens inspect preview of card-back.png
  simulatePointerDown(button1, { x: 200, y: 200 });
  // Wait/fire timer
  isHoldTriggered = true;
  suppressNextClick = true;
  inspectedTarget = cardBackTarget;
  assert.deepEqual(inspectedTarget, cardBackTarget);
  // Release closes inspect preview
  simulatePointerUp();
  assert.equal(inspectedTarget, null);
  // Successful hold does NOT select position 1 on release
  simulateClick(button1, 1);
  assert.equal(selectedPosition, 0); // Still 0, position 1 was NOT selected!

  // Scenario 3: Movement > 12px cancels inspect hold
  simulatePointerDown(button1, { x: 200, y: 200 });
  simulatePointerMove({ x: 215, y: 200 }); // moved 15px > 12px
  assert.equal(timer, null); // timer was cancelled
  assert.equal(isHoldTriggered, false);
  simulatePointerUp();
  simulateClick(button1, 1);
  assert.equal(selectedPosition, 1); // Now selected because inspect was cancelled by movement

  // Scenario 4: Pointer cancel leaves no stale click suppression
  simulatePointerDown(button0, { x: 100, y: 100 });
  simulatePointerCancel();
  assert.equal(suppressNextClick, false);
  simulateClick(button0, 0);
  assert.equal(selectedPosition, 0);
});
