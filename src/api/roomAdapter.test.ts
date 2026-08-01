import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptRoomState } from './roomAdapter.ts';
import type { BackendRoomState } from './roomState.ts';

test('room adapter marks only the explicit current player as You', () => {
  const backend: BackendRoomState = {
    room_id: '12d52462',
    status: 'WAITING',
    host_id: 'gg-id',
    player_count: 4,
    trump_mode: 'normal',
    players: [
      { player_id: 'gg-id', display_name: 'GG', team_id: 'TeamA', seat_index: 0, is_online: true },
      { player_id: 'jd-id', display_name: 'JD', team_id: 'TeamB', seat_index: 1, is_online: true },
      { player_id: 'ag-id', display_name: 'AG', team_id: 'TeamA', seat_index: 2, is_online: true },
      { player_id: 'vp-id', display_name: 'VP', team_id: 'TeamB', seat_index: 3, is_online: true },
    ],
  };
  const room = adaptRoomState(backend, 'jd-id');
  assert.deepEqual(room.players.filter((player) => player.isCurrentPlayer).map((player) => player.id), ['jd-id']);
  assert.equal(room.config.code, '12D52462');
});

test('room adapter uses authoritative team_id instead of array parity and sorts by seat_index', () => {
  const backend: BackendRoomState = {
    room_id: 'abcd1234',
    status: 'WAITING',
    host_id: 'host',
    player_count: 4,
    trump_mode: 'hidden',
    players: [
      { player_id: 'late-a', display_name: 'Late A', team_id: 'TeamA', seat_index: 3, is_online: true },
      { player_id: 'first-b', display_name: 'First B', team_id: 'TeamB', seat_index: 0, is_online: false },
      { player_id: 'middle-b', display_name: 'Middle B', team_id: 'TeamB', seat_index: 2, is_online: true },
      { player_id: 'host', display_name: 'Host', team_id: 'TeamA', seat_index: 1, is_online: true },
    ],
  };

  const room = adaptRoomState(backend, 'first-b');
  assert.deepEqual(room.players.map((player) => player.id), ['first-b', 'host', 'middle-b', 'late-a']);
  assert.deepEqual(room.players.map((player) => player.team), ['B', 'A', 'B', 'A']);
  assert.equal(room.players[0].connection, 'offline');
  assert.equal(room.players[0].isCurrentPlayer, true);
  assert.equal(room.players[1].isHost, true);
  assert.equal(room.status, 'WAITING');
});

test('authoritative room updates move a player and remain stable across refresh or reconnect', () => {
  const base: BackendRoomState = {
    room_id: 'abcd1234',
    status: 'WAITING',
    host_id: 'host',
    player_count: 4,
    trump_mode: 'normal',
    players: [
      { player_id: 'host', display_name: 'Host', team_id: 'TeamA', seat_index: 0, is_online: true },
      { player_id: 'me', display_name: 'Me', team_id: 'TeamA', seat_index: 1, is_online: true },
      { player_id: 'p3', display_name: 'P3', team_id: 'TeamB', seat_index: 2, is_online: true },
      { player_id: 'p4', display_name: 'P4', team_id: 'TeamB', seat_index: 3, is_online: true },
    ],
  };
  const before = adaptRoomState(base, 'me');
  const switched: BackendRoomState = {
    ...base,
    players: base.players.map((player) => (
      player.player_id === 'me' ? { ...player, team_id: 'TeamB' } : player
    )),
  };
  const after = adaptRoomState(switched, 'me');
  const reconnected = adaptRoomState(switched, 'me');

  assert.equal(before.players.find((player) => player.id === 'me')?.team, 'A');
  assert.equal(after.players.find((player) => player.id === 'me')?.team, 'B');
  assert.equal(reconnected.players.find((player) => player.id === 'me')?.team, 'B');
  assert.equal(reconnected.players.find((player) => player.id === 'me')?.isCurrentPlayer, true);
  assert.equal(reconnected.players.find((player) => player.id === 'host')?.isHost, true);
});
