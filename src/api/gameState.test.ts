import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { adaptGameState, canSubmitCard, createPlayCardRequest, derivePlayableIds, resolveGameplayActionError } from './gameState.ts';
import type { BackendCard, BackendGameState } from './gameState.ts';
import type { RoomState } from '../types.ts';
import { screenForAuthoritativeState } from '../utils/setupLifecycle.ts';

const ids = ['p1', 'p2', 'p3', 'p4'];
const room: RoomState = {
  status: 'IN_GAME',
  config: { code: 'ABCD1234', playerCount: 4, trumpMode: 'normal' },
  hostId: 'p1',
  teams: { A: 'Team Maroon', B: 'Team Gold' },
  returnedToLobbyPlayerIds: [],
  players: ids.map((id, seatIndex) => ({
    id, displayName: `Player ${seatIndex + 1}`, team: seatIndex % 2 === 0 ? 'A' : 'B', seatIndex,
    isHost: id === 'p1', isReady: true, connection: 'online', isCurrentPlayer: id === 'p1',
  })),
};
const hand: BackendCard[] = [
  { suit: 'SPADES', rank: 14 }, { suit: 'SPADES', rank: 13 }, { suit: 'SPADES', rank: 12 },
  { suit: 'HEARTS', rank: 11 }, { suit: 'HEARTS', rank: 10 }, { suit: 'HEARTS', rank: 9 },
  { suit: 'DIAMONDS', rank: 8 }, { suit: 'DIAMONDS', rank: 7 }, { suit: 'DIAMONDS', rank: 6 },
  { suit: 'CLUBS', rank: 5 }, { suit: 'CLUBS', rank: 4 }, { suit: 'CLUBS', rank: 3 },
];

function snapshot(overrides: Partial<BackendGameState> = {}): BackendGameState {
  return {
    game_id: 'game-1', player_count: 4,
    players: ids.map((player_id, seat_index) => ({ player_id, seat_index, team_id: seat_index % 2 === 0 ? 'TeamA' : 'TeamB' })),
    teams: {
      TeamA: { team_id: 'TeamA', player_ids: ['p1', 'p3'], captured_cards: [], tricks_won: 0, tens_captured: 0 },
      TeamB: { team_id: 'TeamB', player_ids: ['p2', 'p4'], captured_cards: [], tricks_won: 0, tens_captured: 0 },
    },
    seat_order: ids, hands: { p1: hand }, phase: 'PLAYING', current_turn: 'p1', current_player_id: 'p1',
    current_trick: { lead_player_id: null, lead_suit: null, played_cards: [], winner_player_id: null, completed: false },
    current_trick_leader: null,
    completed_tricks: [], trump_state: { status: 'NONE', suit: null, hidden_rank: null, hidden_card_index: null, trump_hider_id: null },
    hidden_trump_mode: false, room_id: room.config.code, room_status: 'IN_GAME', host_id: 'p1', version: 3,
    ...overrides,
  };
}

test('initial 4-player view is entirely backend-driven', () => {
  const state = adaptGameState(snapshot(), room, 'p1');
  assert.equal(state.hand.length, 12);
  assert.equal(state.hand.some((card) => card.rank === '2'), false);
  assert.deepEqual(state.trick.cards, []);
  assert.equal(state.currentTrickLeader, null);
  assert.equal(state.trickNumber, 1);
  assert.equal(state.totalTricks, 12);
  assert.deepEqual(state.scores, {
    A: { name: 'Team Maroon', tricks: 0, tens: 0, capturedMendis: [] },
    B: { name: 'Team Gold', tricks: 0, tens: 0, capturedMendis: [] },
  });
  assert.deepEqual(state.players.map((player) => player.cardsRemaining), [12, 12, 12, 12]);
});

test('PLAY_CARD uses the exact backend payload and never mutates local state', () => {
  const state = adaptGameState(snapshot(), room, 'p1');
  const card = state.hand[0];
  const before = structuredClone(state);
  assert.deepEqual(createPlayCardRequest(card), { action: 'PLAY_CARD', payload: { suit: 'SPADES', rank: 14 } });
  assert.deepEqual(state, before);
  assert.equal(canSubmitCard(state, 'p1', false, card.id), true);
  assert.equal(canSubmitCard(state, 'p1', true, card.id), false);
  assert.equal(canSubmitCard(state, 'p2', false, card.id), false);
});

function completedCards(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    player_id: `p${index + 1}`,
    card: { suit: 'SPADES' as const, rank: 14 - index },
  }));
}

test('authoritative resolution snapshots render every completed card and clear only on the next snapshot', () => {
  const played = completedCards(4);
  const after = snapshot({
    version: 4, current_turn: null, phase: 'TRICK_RESOLUTION', hands: { p1: hand.slice(1) },
    current_trick: { lead_player_id: 'p1', lead_suit: 'SPADES', played_cards: played, winner_player_id: 'p1', completed: true },
    current_trick_leader: { player_id: 'p1', display_name: 'Player 1', card: played[0].card },
    teams: {
      TeamA: { ...snapshot().teams.TeamA, tricks_won: 1, tens_captured: 1 },
      TeamB: { ...snapshot().teams.TeamB, tricks_won: 0, tens_captured: 0 },
    },
  });
  const p1 = adaptGameState(after, room, 'p1');
  const p2 = adaptGameState({ ...after, hands: { p2: hand.slice(1) } }, room, 'p2');
  assert.equal(p1.hand.length, 11);
  assert.deepEqual(p1.trick, p2.trick);
  assert.equal(p1.trick.cards.length, 4);
  assert.equal(p1.currentTrickLeader?.playerId, 'p1');
  assert.equal(canSubmitCard(p1, 'p1', false, p1.hand[0].id), false);
  assert.deepEqual(p1.scores, {
    A: { name: 'Team Maroon', tricks: 1, tens: 1, capturedMendis: [] },
    B: { name: 'Team Gold', tricks: 0, tens: 0, capturedMendis: [] },
  });

  const reconnect = adaptGameState(structuredClone(after), room, 'p1');
  assert.deepEqual(reconnect.trick, p1.trick);
  assert.deepEqual(reconnect.currentTrickLeader, p1.currentTrickLeader);

  const reset = adaptGameState(snapshot({ version: 5, current_turn: 'p1', teams: after.teams, completed_tricks: [{ ...after.current_trick, played_cards: played, completed: true, winner_player_id: 'p1' }] }), room, 'p1');
  assert.deepEqual(reset.trick.cards, []);
  assert.equal(reset.trickNumber, 2);
  assert.deepEqual(reset.scores, p1.scores);
});

test('six-player and eight-player resolution snapshots preserve all completed cards', () => {
  for (const playerCount of [6, 8] as const) {
    const cards = completedCards(playerCount);
    const resolved = adaptGameState(snapshot({
      player_count: playerCount,
      phase: 'TRICK_RESOLUTION',
      current_turn: null,
      current_trick: { lead_player_id: 'p1', lead_suit: 'SPADES', played_cards: cards, winner_player_id: 'p1', completed: true },
      current_trick_leader: { player_id: 'p1', display_name: 'Player 1', card: cards[0].card },
    }), room, 'p1');
    assert.equal(resolved.trick.cards.length, playerCount);
    assert.equal(resolved.currentTrickLeader?.playerId, 'p1');
  }
});

test('current trick leader follows authoritative updates and resets to null', () => {
  const firstCard = { suit: 'HEARTS' as const, rank: 7 };
  const first = adaptGameState(snapshot({
    version: 4,
    current_trick_leader: { player_id: 'p1', display_name: 'Player 1', card: firstCard },
  }), room, 'p1');
  assert.deepEqual(first.currentTrickLeader, {
    playerId: 'p1',
    displayName: 'Player 1',
    card: { id: 'HEARTS:7', suit: 'hearts', rank: '7' },
    team: 'A',
  });

  const trumpUpdate = adaptGameState(snapshot({
    version: 5,
    trump_state: { status: 'PUBLIC', suit: 'SPADES', hidden_rank: null, hidden_card_index: null, trump_hider_id: null },
    current_trick_leader: { player_id: 'p2', display_name: 'Player 2', card: { suit: 'SPADES', rank: 12 } },
  }), room, 'p1');
  assert.equal(trumpUpdate.currentTrickLeader?.displayName, 'Player 2');
  assert.deepEqual(trumpUpdate.currentTrickLeader?.card, {
    id: 'SPADES:12', suit: 'spades', rank: 'Q',
  });
  assert.equal(trumpUpdate.currentTrickLeader?.team, 'B');

  const reset = adaptGameState(snapshot({ version: 6, current_trick_leader: null }), room, 'p1');
  assert.equal(reset.currentTrickLeader, null);
});

test('adapter never calculates a leader from local trick or trump data', () => {
  const state = adaptGameState(snapshot({
    current_trick: {
      lead_player_id: 'p1',
      lead_suit: 'HEARTS',
      played_cards: [
        { player_id: 'p1', card: { suit: 'HEARTS', rank: 14 } },
        { player_id: 'p2', card: { suit: 'CLUBS', rank: 3 } },
      ],
      winner_player_id: null,
      completed: false,
    },
    current_trick_leader: {
      player_id: 'p2',
      display_name: 'Backend says P2',
      card: { suit: 'CLUBS', rank: 3 },
    },
  }), room, 'p1');

  assert.equal(state.currentTrickLeader?.playerId, 'p2');
  assert.equal(state.currentTrickLeader?.displayName, 'Backend says P2');
});

test('legal display eligibility follows suit and public trump without replacing backend validation', () => {
  const base = snapshot({
    current_trick: { lead_player_id: 'p2', lead_suit: 'HEARTS', played_cards: [{ player_id: 'p2', card: { suit: 'HEARTS', rank: 14 } }], winner_player_id: null, completed: false },
  });
  const following = adaptGameState(base, room, 'p1');
  assert.deepEqual([...derivePlayableIds(following, 'p1')].sort(), ['HEARTS:10', 'HEARTS:11', 'HEARTS:9'].sort());
  const cutHand = hand.filter((card) => card.suit !== 'HEARTS');
  const publicTrump = adaptGameState({ ...base, hands: { p1: cutHand }, trump_state: { ...base.trump_state, status: 'PUBLIC', suit: 'CLUBS' } }, room, 'p1');
  assert.deepEqual([...derivePlayableIds(publicTrump, 'p1')].sort(), ['CLUBS:3', 'CLUBS:4', 'CLUBS:5'].sort());
});

test('gameplay errors stay recoverable and reconnect adaptation restores exact state', () => {
  for (const code of ['NotPlayersTurn', 'MustFollowSuit', 'MustPlayTrump', 'CardNotOwned', 'INVALID_PHASE', 'INVALID_PAYLOAD']) {
    assert.equal(resolveGameplayActionError({ action: 'PLAY_CARD', code, message: `error: ${code}` }), `error: ${code}`);
  }
  assert.equal(resolveGameplayActionError({ action: 'START_GAME', message: 'no' }), null);
  const wire = snapshot({ version: 12, teams: {
    TeamA: { ...snapshot().teams.TeamA, tricks_won: 2, tens_captured: 1 },
    TeamB: { ...snapshot().teams.TeamB, tricks_won: 1, tens_captured: 0 },
  } });
  const first = adaptGameState(wire, room, 'p1');
  const reconnect = adaptGameState(structuredClone(wire), room, 'p1');
  assert.deepEqual(reconnect, first);
});

test('captured Mendis are authoritative, team-specific, and preserved only within the same game', () => {
  const captured = snapshot({
    version: 13,
    captured_mendis: { TeamA: ['SPADES', 'DIAMONDS'], TeamB: ['HEARTS'] },
  });
  const first = adaptGameState(captured, room, 'p1');
  assert.deepEqual(first.scores.A.capturedMendis, ['spades', 'diamonds']);
  assert.deepEqual(first.scores.B.capturedMendis, ['hearts']);

  const reconnect = adaptGameState(structuredClone(captured), room, 'p1', first);
  assert.deepEqual(reconnect.scores, first.scores);

  const transitional = adaptGameState(snapshot({ version: 14 }), room, 'p1', first);
  assert.deepEqual(transitional.scores.A.capturedMendis, ['spades', 'diamonds']);
  assert.deepEqual(transitional.scores.B.capturedMendis, ['hearts']);

  const newGame = adaptGameState(snapshot({ game_id: 'game-2', version: 1 }), room, 'p1', first);
  assert.deepEqual(newGame.scores.A.capturedMendis, []);
  assert.deepEqual(newGame.scores.B.capturedMendis, []);
});

test('final-score display keeps the table authoritative, disables plays, and retains final Mendis on terminal refresh', () => {
  const finalWire = snapshot({
    version: 15,
    phase: 'FINAL_SCORE_DISPLAY',
    current_turn: null,
    teams: {
      TeamA: { ...snapshot().teams.TeamA, tricks_won: 7, tens_captured: 3 },
      TeamB: { ...snapshot().teams.TeamB, tricks_won: 5, tens_captured: 1 },
    },
    captured_mendis: { TeamA: ['SPADES', 'HEARTS', 'DIAMONDS'], TeamB: ['CLUBS'] },
  });
  const final = adaptGameState(finalWire, room, 'p1');
  assert.equal(final.phase, 'FINAL_SCORE_DISPLAY');
  assert.equal(screenForAuthoritativeState('IN_GAME', final.phase), 'game');
  assert.equal(canSubmitCard(final, 'p1', false, final.hand[0].id), false);
  assert.deepEqual(final.scores.A, { name: 'Team Maroon', tricks: 7, tens: 3, capturedMendis: ['spades', 'hearts', 'diamonds'] });
  assert.deepEqual(final.scores.B, { name: 'Team Gold', tricks: 5, tens: 1, capturedMendis: ['clubs'] });

  const gameOver = adaptGameState({ ...finalWire, phase: 'GAME_OVER', version: 16 }, room, 'p1');
  assert.equal(screenForAuthoritativeState('IN_GAME', gameOver.phase), 'game-end');
  assert.deepEqual(gameOver.scores, final.scores);
  assert.equal(screenForAuthoritativeState('IN_GAME', 'DRAW'), 'game-end');
});

test('terminal snapshots carry the authoritative returned_to_lobby_player_ids without synthesis', () => {
  const state = adaptGameState(snapshot({
    phase: 'GAME_OVER',
    returned_to_lobby_player_ids: ['p2'],
  }), room, 'p1');
  assert.deepEqual(state.returnedToLobbyPlayerIds, ['p2']);
  const absent = adaptGameState(snapshot({ phase: 'DRAW' }), room, 'p1');
  assert.deepEqual(absent.returnedToLobbyPlayerIds, []);
});

test('resolution display is backend-timed, winner-highlighted, and routes to results only after the later terminal snapshot', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const table = readFileSync(new URL('../screens/GameTablePage.tsx', import.meta.url), 'utf8');
  const trick = readFileSync(new URL('../components/game/CurrentTrick.tsx', import.meta.url), 'utf8');

  assert.equal(app.includes("action: 'RESOLVE_TRICK'"), false);
  assert.equal(table.includes('setTimeout'), false);
  assert.equal(trick.includes('setTimeout'), false);
  assert.match(table, /isResolving/);
  assert.match(table, /Resolving trick/);
  assert.match(trick, /ring-gold-400/);
  assert.match(trick, /wins this trick/);
  assert.equal(screenForAuthoritativeState('IN_GAME', 'TRICK_RESOLUTION'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'FINAL_SCORE_DISPLAY'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'TRUMP_REVEAL_DISPLAY'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'HIDDEN_CARD_RETURN'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'GAME_OVER'), 'game-end');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'DRAW'), 'game-end');
});

test('derivePlayableIds disables card play during reveal and return phases', () => {
  const base = snapshot();
  const playing = adaptGameState(base, room, 'p1');
  assert.ok(derivePlayableIds(playing, 'p1').size > 0);

  const reveal = adaptGameState({ ...base, phase: 'TRUMP_REVEAL_DISPLAY' }, room, 'p1');
  assert.equal(derivePlayableIds(reveal, 'p1').size, 0);

  const cardReturn = adaptGameState({ ...base, phase: 'HIDDEN_CARD_RETURN' }, room, 'p1');
  assert.equal(derivePlayableIds(cardReturn, 'p1').size, 0);
});

test('production routes do not import gameplay mocks and scoreboard uses a non-clipping score grid', () => {
  const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
  const scoreboard = readFileSync(new URL('../components/game/Scoreboard.tsx', import.meta.url), 'utf8');
  const leader = readFileSync(new URL('../components/game/CurrentTrickLeader.tsx', import.meta.url), 'utf8');
  assert.equal(app.includes("from '@/mockData'"), false);
  assert.equal(app.includes('End game (demo)'), false);
  assert.equal(scoreboard.includes('truncate'), false);
  assert.match(scoreboard, /grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.2fr\)\]/);
  assert.match(scoreboard, /CapturedMendisSlots/);
  assert.match(scoreboard, /MetricColumn/);
  assert.match(scoreboard, /whitespace-nowrap/);
  assert.match(scoreboard, /min-w-0/);
  assert.match(leader, /Current Trick Leader/);
  assert.match(leader, /No cards played yet/);
  assert.match(leader, /leader\.displayName/);
  assert.match(leader, /leader\.card\.rank/);
  assert.match(leader, /SUIT_SYMBOL\[leader\.card\.suit\]/);
  assert.match(leader, /SUIT_NAME\[leader\.card\.suit\]/);
  assert.match(leader, /aria-live="polite"/);
  assert.match(leader, /w-full/);
  assert.match(leader, /min-w-0/);
  assert.match(leader, /overflow-hidden/);
  assert.equal(leader.includes('current_trick'), false);
});
