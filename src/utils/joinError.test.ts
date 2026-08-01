import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyJoinError } from './joinError.ts';

test('unknown-room detail wins over generic 400 and maps to Incorrect Room Code', () => {
  assert.equal(classifyJoinError(400, { detail: 'Unknown room supplied' }), 'room-not-found');
  assert.equal(classifyJoinError(422, { detail: 'Room does not exist' }), 'room-not-found');
  assert.equal(classifyJoinError(404, null), 'room-not-found');
});

test('room-full and game-started details keep their priority', () => {
  assert.equal(classifyJoinError(400, { detail: 'Room full: maximum players reached' }), 'room-full');
  assert.equal(classifyJoinError(422, { detail: 'Game has started' }), 'game-started');
});

test('unknown bodies are safe and generic validation errors remain invalid requests', () => {
  assert.equal(classifyJoinError(400, { detail: ['validation'] }), 'invalid-request');
  assert.equal(classifyJoinError(422, 'not-json'), 'invalid-request');
  assert.equal(classifyJoinError(500, null), 'generic');
});
