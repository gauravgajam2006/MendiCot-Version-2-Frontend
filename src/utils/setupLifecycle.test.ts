import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCancelGameSetupRequest,
  createFirstPlayerSelectionRequest,
  resolveSetupActionError,
  screenForAuthoritativeState,
  shouldAcceptGamePhase,
} from './setupLifecycle.ts';

test('Start remains on lobby until an authoritative setup state arrives', () => {
  assert.equal(screenForAuthoritativeState('WAITING', null), 'lobby');
  assert.equal(screenForAuthoritativeState('GAME_SETUP', 'FIRST_PLAYER_SELECTION'), 'host-setup');
});

test('authoritative setup state routes both host and non-host clients to setup', () => {
  assert.equal(screenForAuthoritativeState('GAME_SETUP', 'FIRST_PLAYER_SELECTION'), 'host-setup');
});

test('authoritative WAITING state returns every client to lobby after cancellation', () => {
  assert.equal(screenForAuthoritativeState('WAITING', null), 'lobby');
});

test('reconnect routing honors the current setup phase and subsequent game phases', () => {
  assert.equal(screenForAuthoritativeState('GAME_SETUP', 'FIRST_PLAYER_SELECTION'), 'host-setup');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'PLAYING'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'GAME_OVER'), 'game-end');
});

test('corrected normal and hidden post-selection phases route intentionally', () => {
  assert.equal(screenForAuthoritativeState('IN_GAME', 'PLAYING'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'HIDDEN_TRUMP_SELECTION'), 'hidden-trump');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'HIDDEN_TRUMP_REVEAL'), 'hidden-trump');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'TRICK_RESOLUTION'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'FINAL_SCORE_DISPLAY'), 'game');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'GAME_OVER'), 'game-end');
  assert.equal(screenForAuthoritativeState('IN_GAME', 'DRAW'), 'game-end');
});

test('a stale first-player callback cannot override a newer authoritative phase', () => {
  assert.equal(shouldAcceptGamePhase('PLAYING', 'FIRST_PLAYER_SELECTION'), false);
  assert.equal(shouldAcceptGamePhase('HIDDEN_TRUMP_SELECTION', 'FIRST_PLAYER_SELECTION'), false);
  assert.equal(shouldAcceptGamePhase('FIRST_PLAYER_SELECTION', 'PLAYING'), true);
});

test('CREATED is transitional and never becomes a stuck setup destination', () => {
  assert.equal(screenForAuthoritativeState('IN_GAME', 'CREATED'), null);
  assert.equal(shouldAcceptGamePhase('FIRST_PLAYER_SELECTION', 'CREATED'), true);
  assert.equal(shouldAcceptGamePhase('FIRST_PLAYER_SELECTION', 'HIDDEN_TRUMP_SELECTION'), true);
});

test('cancel and first-player actions use exact payloads and prevent duplicates', () => {
  assert.deepEqual(createCancelGameSetupRequest(false), {
    action: 'CANCEL_GAME_SETUP',
    payload: {},
  });
  assert.equal(createCancelGameSetupRequest(true), null);
  assert.deepEqual(createFirstPlayerSelectionRequest(false, 'P1'), {
    action: 'SELECT_FIRST_PLAYER',
    payload: { player_id: 'P1' },
  });
  assert.equal(createFirstPlayerSelectionRequest(true, 'P1'), null);
});

test('recoverable setup errors stay inline and restore the relevant control', () => {
  assert.equal(
    resolveSetupActionError({ action: 'CANCEL_GAME_SETUP', code: 'HOST_ONLY' }, true, false),
    'Could not cancel game setup. Please try again.',
  );
  assert.equal(
    resolveSetupActionError({ action: 'SELECT_FIRST_PLAYER', code: 'INVALID_PHASE' }, false, true),
    'Could not select the first player. Please try again.',
  );
});
