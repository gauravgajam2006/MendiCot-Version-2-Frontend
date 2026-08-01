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
      { player_id: 'gg-id', display_name: 'GG', is_online: true },
      { player_id: 'jd-id', display_name: 'JD', is_online: true },
      { player_id: 'ag-id', display_name: 'AG', is_online: true },
      { player_id: 'vp-id', display_name: 'VP', is_online: true },
    ],
  };
  const room = adaptRoomState(backend, 'jd-id');
  assert.deepEqual(room.players.filter((player) => player.isCurrentPlayer).map((player) => player.id), ['jd-id']);
  assert.equal(room.config.code, '12D52462');
});
