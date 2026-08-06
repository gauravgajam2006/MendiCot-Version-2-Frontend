import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('./GameEndPage.tsx', import.meta.url), 'utf8');
const button = readFileSync(new URL('../components/ui/Button.tsx', import.meta.url), 'utf8');

test('every player sees Return to Lobby regardless of host status', () => {
  assert.match(page, /onReturnToLobby/);
  assert.ok(page.includes('Return to Lobby'));
  const returnIndex = page.indexOf('Return to Lobby');
  const leaveIndex = page.indexOf('Leave Table');
  assert.ok(returnIndex >= 0 && leaveIndex >= 0 && returnIndex < leaveIndex);
});

test('the result screen does not gate actions behind host-only or waiting-for-host text', () => {
  assert.equal(page.includes('isHost'), false);
  assert.equal(page.includes('Waiting for the host'), false);
  assert.equal(page.includes('The host will start the game'), false);
  assert.equal(page.includes('host'), false);
});

test('Leave Table remains available to every player', () => {
  assert.match(page, /onLeave/);
  assert.ok(page.includes('Leave Table'));
});

test('buttons use exact labels and a semantic disabled state during pending', () => {
  assert.match(page, /disabled=\{returnToLobbyPending\}/);
  assert.match(page, /Returning to lobby…/);
  assert.match(page, /role="status"/);
  assert.match(page, /role="alert"/);
});

test('the result screen does not optimistically route and keeps the terminal result visible while pending', () => {
  assert.equal(page.includes('Returning everyone to the lobby'), false);
  assert.equal(page.includes('setScreen'), false);
  assert.equal(page.includes('setRoom'), false);
  assert.match(page, /scores/);
  assert.match(page, /Trophy/);
});

test('mobile layout stacks Return to Lobby above Leave Table at full width', () => {
  assert.match(page, /flex flex-col gap-3 sm:flex-row sm:items-stretch/);
  assert.match(page, /fullWidth/);
});

test('desktop layout renders one row with balanced buttons and no horizontal overflow', () => {
  assert.match(page, /sm:flex-row sm:items-stretch/);
  assert.match(page, /sm:flex-1/);
  assert.match(page, /max-w-3xl/);
  assert.equal(page.includes('overflow-x'), false);
  assert.equal(page.includes('overflow-x-auto'), false);
});

test('buttons meet the minimum 44px touch target via the large button size', () => {
  assert.match(page, /size="lg"/);
  assert.match(button, /h-13/);
});

test('pending and error copy render below the action row inside the result card', () => {
  const actionsIndex = page.indexOf('{/* Actions */}');
  const pendingIndex = page.indexOf('Returning to lobby…');
  const errorIndex = page.indexOf('returnToLobbyError &&');
  assert.ok(actionsIndex >= 0 && pendingIndex > actionsIndex && errorIndex > actionsIndex);
});
