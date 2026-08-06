import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTeamSwitchRequest,
  getLobbyStartState,
  getTeamSwitchControl,
  isTeamSwitchConfirmed,
  resolveLobbyActionError,
} from './lobbyState.ts';
import type { Player, PlayerCount, RoomState, TeamId } from '../types.ts';

function makePlayer(
  id: string,
  team: TeamId,
  seatIndex: number,
  options: { host?: boolean; current?: boolean; online?: boolean } = {},
): Player {
  const online = options.online ?? true;
  return {
    id,
    displayName: id,
    team,
    seatIndex,
    isHost: options.host ?? false,
    isReady: online,
    connection: online ? 'online' : 'offline',
    isCurrentPlayer: options.current ?? false,
  };
}

function makeRoom(
  playerCount: PlayerCount,
  teams: TeamId[],
  options: { currentId?: string; hostId?: string; offlineIndex?: number } = {},
): RoomState {
  const hostId = options.hostId ?? 'p0';
  const currentId = options.currentId ?? hostId;
  return {
    status: 'WAITING',
    config: { code: 'ABCD1234', playerCount, trumpMode: 'normal' },
    players: teams.map((team, index) => makePlayer('p' + index, team, index, {
      host: 'p' + index === hostId,
      current: 'p' + index === currentId,
      online: index !== options.offlineIndex,
    })),
    hostId,
    teams: { A: 'Team Maroon', B: 'Team Gold' },
    returnedToLobbyPlayerIds: [],
  };
}

test('only the current player sees one switch control and it targets the other team', () => {
  const room = makeRoom(4, ['A', 'B', 'A', 'B'], { currentId: 'p1' });
  const controls = room.players.map((player) => getTeamSwitchControl(player, 'p1')).filter(Boolean);

  assert.equal(controls.length, 1);
  assert.deepEqual(controls[0], { label: 'Switch to Team Maroon', targetTeam: 'A' });
  assert.equal(getTeamSwitchControl(room.players[0], 'p1'), null);
});

test('the host sees the same switch control without losing host identity', () => {
  const room = makeRoom(4, ['A', 'B', 'A', 'B']);
  const host = room.players[0];

  assert.equal(host.isHost, true);
  assert.deepEqual(getTeamSwitchControl(host, host.id), {
    label: 'Switch to Team Gold',
    targetTeam: 'B',
  });
});

test('team switch request sends the exact backend payload and pending prevents duplicates', () => {
  const first = createTeamSwitchRequest(null, 'B');
  assert.deepEqual(first, {
    pendingTeamId: 'TeamB',
    message: {
      action: 'SWITCH_TEAM',
      payload: { team_id: 'TeamB' },
    },
  });
  assert.equal(createTeamSwitchRequest(first?.pendingTeamId ?? null, 'A'), null);
});

test('pending switch clears only when authoritative state confirms the target team', () => {
  assert.equal(isTeamSwitchConfirmed('TeamB', 'TeamA'), false);
  assert.equal(isTeamSwitchConfirmed('TeamB', 'TeamB'), true);
  assert.equal(isTeamSwitchConfirmed(null, 'TeamB'), false);
});

for (const playerCount of [4, 6, 8] as const) {
  test(String(playerCount) + '-player rooms report the correct team counts and required size', () => {
    const required = playerCount / 2;
    const room = makeRoom(
      playerCount,
      Array.from({ length: playerCount }, (_, index) => index < required ? 'A' : 'B'),
    );
    const state = getLobbyStartState(room, 'p0');

    assert.equal(state.requiredTeamSize, required);
    assert.deepEqual(state.teamCounts, { A: required, B: required });
    assert.equal(state.canStart, true);
  });
}

test('unbalanced teams disable Start Game for the host', () => {
  const room = makeRoom(4, ['A', 'A', 'A', 'B']);
  const state = getLobbyStartState(room, 'p0');

  assert.equal(state.canStart, false);
  assert.equal(state.reason, 'Teams must be balanced before starting.');
});

test('an offline player disables Start Game before balance is considered', () => {
  const room = makeRoom(4, ['A', 'B', 'A', 'B'], { offlineIndex: 2 });
  const state = getLobbyStartState(room, 'p0');

  assert.equal(state.canStart, false);
  assert.equal(state.reason, 'A player is offline.');
});

test('a balanced full online room enables Start Game only for the host', () => {
  const room = makeRoom(4, ['A', 'B', 'A', 'B']);

  assert.equal(getLobbyStartState(room, 'p0').canStart, true);
  assert.equal(getLobbyStartState(room, 'p1').canStart, false);
  assert.equal(getLobbyStartState(room, 'p1').reason, 'The host will start the game.');
});

test('a recoverable switch failure clears pending without requiring a global screen', () => {
  const resolution = resolveLobbyActionError(
    { code: 'INVALID_TEAM', action: 'SWITCH_TEAM' },
    'TeamB',
    false,
  );

  assert.deepEqual(resolution, {
    action: 'switch-team',
    message: 'Could not switch teams. Please try again.',
  });
});

test('Start Game backend rejection codes map to clear lobby messages', () => {
  assert.deepEqual(
    resolveLobbyActionError({ code: 'TEAMS_UNBALANCED' }, null, true),
    { action: 'start-game', message: 'Teams must be balanced before starting.' },
  );
  assert.deepEqual(
    resolveLobbyActionError({ code: 'HOST_ONLY', action: 'START_GAME' }, null, true),
    { action: 'start-game', message: 'Only the host can start the game.' },
  );
});
