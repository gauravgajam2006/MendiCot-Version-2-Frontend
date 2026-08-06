import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '../types.ts';
import {
  countPlayersInPostGameLobby,
  createReturnToLobbyRequest,
  deriveReturnToLobbyStatus,
  isPlayerReturnedToLobby,
  resolveReturnToLobbyError,
  RETURN_TO_LOBBY_ACTION,
  RETURN_TO_LOBBY_ERROR_MESSAGES,
  RETURN_TO_LOBBY_STATUS_LABELS,
} from './returnToLobby.ts';

test('Return to Lobby sends the exact backend payload', () => {
  assert.deepEqual(createReturnToLobbyRequest(false), {
    action: 'RETURN_TO_LOBBY',
    payload: {},
  });
});

test('a pending request blocks a second send', () => {
  assert.equal(createReturnToLobbyRequest(true), null);
});

test('pending state clears only for RETURN_TO_LOBBY errors, not unrelated actions', () => {
  assert.equal(resolveReturnToLobbyError({ action: 'PLAY_CARD', code: 'INVALID_PHASE' }, true), null);
  assert.equal(resolveReturnToLobbyError({ action: 'START_GAME', code: 'HOST_ONLY' }, true), null);
  assert.equal(resolveReturnToLobbyError({ action: RETURN_TO_LOBBY_ACTION, code: 'INVALID_PHASE' }, true), 'The room cannot be returned right now.');
});

test('each stable backend error maps to the inline message', () => {
  assert.equal(resolveReturnToLobbyError({ action: RETURN_TO_LOBBY_ACTION, code: 'INVALID_SESSION' }, true), 'Your session is no longer valid.');
  assert.equal(resolveReturnToLobbyError({ action: RETURN_TO_LOBBY_ACTION, code: 'PLAYER_NOT_IN_ROOM' }, true), 'You are no longer part of this room.');
  assert.equal(resolveReturnToLobbyError({ action: RETURN_TO_LOBBY_ACTION, code: 'INVALID_PHASE' }, true), 'The room cannot be returned right now.');
  assert.equal(resolveReturnToLobbyError({ action: RETURN_TO_LOBBY_ACTION, code: 'GAME_NOT_STARTED' }, true), 'No completed match is available.');
});

test('errors resolve even when the action field is omitted', () => {
  assert.equal(resolveReturnToLobbyError({ code: 'INVALID_PHASE' }, true), 'The room cannot be returned right now.');
});

test('an unknown code falls back to a generic inline message', () => {
  assert.equal(resolveReturnToLobbyError({ action: RETURN_TO_LOBBY_ACTION, code: 'SOMETHING_ELSE' }, true), 'Could not return to the lobby. Please try again.');
});

test('no error resolves when nothing is pending or the payload is malformed', () => {
  assert.equal(resolveReturnToLobbyError({ code: 'INVALID_PHASE' }, false), null);
  assert.equal(resolveReturnToLobbyError(null, true), null);
  assert.equal(resolveReturnToLobbyError('INVALID_PHASE', true), null);
  assert.equal(resolveReturnToLobbyError([{ code: 'INVALID_PHASE' }], true), null);
});

test('the error map contains exactly the four stable backend codes', () => {
  assert.deepEqual(Object.keys(RETURN_TO_LOBBY_ERROR_MESSAGES).sort(), [
    'GAME_NOT_STARTED',
    'INVALID_PHASE',
    'INVALID_SESSION',
    'PLAYER_NOT_IN_ROOM',
  ]);
});

function player(overrides: Partial<Player>): Player {
  return {
    id: 'p1',
    displayName: 'P1',
    team: 'A',
    seatIndex: 0,
    isHost: false,
    isReady: true,
    connection: 'online',
    isCurrentPlayer: false,
    ...overrides,
  };
}

test('return confirmation requires the player id inside the authoritative returned list', () => {
  assert.equal(isPlayerReturnedToLobby('p2', []), false);
  assert.equal(isPlayerReturnedToLobby('p2', ['p1']), false);
  assert.equal(isPlayerReturnedToLobby('p2', ['p2', 'p3']), true);
});

test('post-game status labels are returned and online, still-in-game, or offline', () => {
  const returnedOnline = player({ id: 'p1', connection: 'online' });
  const returnedOffline = player({ id: 'p1', connection: 'offline' });
  const notReturned = player({ id: 'p2', connection: 'online' });
  const notReturnedOffline = player({ id: 'p3', connection: 'offline' });

  assert.equal(deriveReturnToLobbyStatus(returnedOnline, ['p1']), 'in-lobby');
  assert.equal(deriveReturnToLobbyStatus(returnedOffline, ['p1']), 'offline');
  assert.equal(deriveReturnToLobbyStatus(notReturned, ['p1']), 'still-in-game');
  assert.equal(deriveReturnToLobbyStatus(notReturnedOffline, []), 'offline');
  assert.equal(RETURN_TO_LOBBY_STATUS_LABELS['in-lobby'], 'In Lobby');
  assert.equal(RETURN_TO_LOBBY_STATUS_LABELS['still-in-game'], 'Still in the Game');
  assert.equal(RETURN_TO_LOBBY_STATUS_LABELS.offline, 'Offline');
});

test('offline takes visual priority over returned status', () => {
  assert.equal(deriveReturnToLobbyStatus(player({ id: 'p2', connection: 'offline' }), ['p2']), 'offline');
});

test('the returned count counts only online returned players', () => {
  const players: Player[] = [
    player({ id: 'p1', connection: 'online' }),
    player({ id: 'p2', connection: 'offline' }),
    player({ id: 'p3', connection: 'online' }),
    player({ id: 'p4', connection: 'online' }),
  ];
  assert.equal(countPlayersInPostGameLobby(players, ['p1']), 1);
  assert.equal(countPlayersInPostGameLobby(players, ['p1', 'p3']), 2);
  assert.equal(countPlayersInPostGameLobby(players, ['p1', 'p2']), 1);
  assert.equal(countPlayersInPostGameLobby(players, []), 0);
});

test('the returned count supports 4, 6, and 8 player rooms', () => {
  for (const total of [4, 6, 8]) {
    const players: Player[] = Array.from({ length: total }, (_, index) => player({
      id: `p${index}`,
      connection: 'online',
    }));
    assert.equal(countPlayersInPostGameLobby(players, ['p0']), 1);
    assert.equal(countPlayersInPostGameLobby(players, []), 0);
  }
});
