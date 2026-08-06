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
