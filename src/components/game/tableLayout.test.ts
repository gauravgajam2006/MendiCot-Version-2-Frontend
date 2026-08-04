import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, PlayerCount, TeamId } from '../../types.ts';
import { getRelativeSeating } from './tableLayout.ts';

function player(id: string, seatIndex: number, team: TeamId): Player {
  return {
    id,
    displayName: id,
    team,
    seatIndex,
    isHost: id === 'GG',
    isReady: true,
    connection: 'online',
    isCurrentPlayer: false,
    cardsRemaining: 12,
  };
}

const fourPlayers = [
  player('GG', 0, 'A'),
  player('JD', 1, 'B'),
  player('AG', 2, 'A'),
  player('VP', 3, 'B'),
];

test('all four perspectives rotate by authoritative seat with the teammate opposite', () => {
  const expectations: Record<string, { order: string[]; top: string }> = {
    GG: { order: ['JD', 'AG', 'VP'], top: 'AG' },
    AG: { order: ['VP', 'GG', 'JD'], top: 'GG' },
    JD: { order: ['AG', 'VP', 'GG'], top: 'VP' },
    VP: { order: ['GG', 'JD', 'AG'], top: 'JD' },
  };

  for (const [currentPlayerId, expected] of Object.entries(expectations)) {
    const seating = getRelativeSeating([...fourPlayers].reverse(), currentPlayerId, 4);
    assert.equal(seating.currentPlayer?.id, currentPlayerId);
    assert.deepEqual(seating.remotePositions.map((seat) => seat.player.id), expected.order);
    assert.equal(seating.remotePositions.find((seat) => seat.position === 'top')?.player.id, expected.top);
    assert.equal(seating.remotePositions.some((seat) => seat.player.id === currentPlayerId), false);
  }
});

test('every player appears exactly once across local and remote representations', () => {
  for (const currentPlayer of fourPlayers) {
    const seating = getRelativeSeating(fourPlayers, currentPlayer.id, 4);
    const ids = [seating.currentPlayer?.id, ...seating.remotePositions.map((seat) => seat.player.id)];
    assert.equal(new Set(ids).size, fourPlayers.length);
    assert.deepEqual(new Set(ids), new Set(fourPlayers.map((candidate) => candidate.id)));
    assert.equal(seating.remotePositions.some((seat) => seat.player.id === currentPlayer.id), false);
  }
});

function assertCircularLayout(playerCount: PlayerCount) {
  const players = Array.from({ length: playerCount }, (_, seatIndex) =>
    player(`p${seatIndex}`, seatIndex, seatIndex % 2 === 0 ? 'A' : 'B'),
  );
  const currentPlayerId = `p${playerCount - 2}`;
  const scrambled = [players[3], players[0], ...players.slice(4), players[2], players[1]];
  const seating = getRelativeSeating(scrambled, currentPlayerId, playerCount);
  const expected = Array.from({ length: playerCount - 1 }, (_, offset) =>
    `p${(playerCount - 2 + offset + 1) % playerCount}`,
  );

  assert.equal(seating.remotePositions.length, playerCount - 1);
  assert.deepEqual(seating.remotePositions.map((seat) => seat.relativeSeat), expected.map((_, index) => index + 1));
  assert.deepEqual(seating.remotePositions.map((seat) => seat.player.id), expected);
  assert.equal(new Set([seating.currentPlayer?.id, ...expected]).size, playerCount);
}

test('six-player seating preserves circular order without missing or duplicate players', () => {
  assertCircularLayout(6);
});

test('eight-player seating preserves circular order without missing or duplicate players', () => {
  assertCircularLayout(8);
});

test('position comes from relative seat while team styling data remains authoritative', () => {
  const changedTeams = fourPlayers.map((candidate) => ({
    ...candidate,
    team: (candidate.team === 'A' ? 'B' : 'A') as TeamId,
  }));
  const before = getRelativeSeating(fourPlayers, 'GG', 4);
  const after = getRelativeSeating(changedTeams, 'GG', 4);

  assert.deepEqual(after.remotePositions.map((seat) => seat.position), before.remotePositions.map((seat) => seat.position));
  assert.deepEqual(after.remotePositions.map((seat) => seat.player.team), ['A', 'B', 'A']);
});

test('authoritative turn id identifies the same remote player after rotation', () => {
  const currentTurnId = 'VP';
  const seating = getRelativeSeating(fourPlayers, 'AG', 4);
  const highlighted = seating.remotePositions.filter((seat) => seat.player.id === currentTurnId);
  assert.deepEqual(highlighted.map((seat) => ({ id: seat.player.id, relativeSeat: seat.relativeSeat })), [
    { id: 'VP', relativeSeat: 1 },
  ]);
});

test('reconnect rebuild with the same explicit player id is identical', () => {
  const first = getRelativeSeating(fourPlayers, 'AG', 4);
  const reconnect = getRelativeSeating(structuredClone(fourPlayers), 'AG', 4);
  assert.deepEqual(reconnect, first);
});

test('missing current player fails safely without guessing from names or markers', () => {
  const misleading = fourPlayers.map((candidate) => ({
    ...candidate,
    displayName: candidate.id === 'GG' ? 'Missing player' : candidate.displayName,
    isCurrentPlayer: candidate.id === 'GG',
  }));
  assert.deepEqual(getRelativeSeating(misleading, 'missing-id', 4), {
    currentPlayer: null,
    remotePositions: [],
  });
});
