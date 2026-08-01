import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  parseSessionValidationErrorCode,
  validateBeforeOpeningSocket,
  validateRoomSession,
} from './sessionValidation.ts';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('valid validation uses the live contract and is the only result that opens the WebSocket callback', async () => {
  let requestUrl = '';
  let requestBody = '';
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = String(init?.body);
    return jsonResponse({
      valid: true,
      room_id: 'canon001',
      player_id: 'P1',
      display_name: 'Alice',
      room_status: 'WAITING',
      player_online: false,
    });
  };
  let opened = 0;
  const result = await validateBeforeOpeningSocket(
    () => validateRoomSession('Canon001', 'P1', 'secret-token'),
    () => { opened += 1; },
  );

  assert.equal(result.kind, 'valid');
  assert.equal(opened, 1);
  assert.match(requestUrl, /\/api\/rooms\/CANON001\/sessions\/validate$/);
  assert.deepEqual(JSON.parse(requestBody), { player_id: 'P1', session_token: 'secret-token' });
  if (result.kind === 'valid') assert.equal(result.session.roomId, 'CANON001');
});

test('SESSION_EXPIRED, ROOM_NOT_FOUND and INVALID_SESSION never open the WebSocket callback', async () => {
  for (const [status, code] of [[410, 'SESSION_EXPIRED'], [404, 'ROOM_NOT_FOUND'], [401, 'INVALID_SESSION']] as const) {
    globalThis.fetch = async () => jsonResponse({ detail: { code, message: 'Rejected' } }, status);
    let opened = 0;
    const result = await validateBeforeOpeningSocket(
      () => validateRoomSession('ROOM0001', 'P1', 'secret-token'),
      () => { opened += 1; },
    );
    assert.deepEqual(result, { kind: 'rejected', code });
    assert.equal(opened, 0);
  }
});

test('network failure and HTTP 5xx preserve the preflight as unavailable and never open a socket', async () => {
  for (const fetchImpl of [
    async () => { throw new TypeError('network down'); },
    async () => jsonResponse({ detail: 'temporary' }, 503),
  ]) {
    globalThis.fetch = fetchImpl;
    let opened = 0;
    const result = await validateBeforeOpeningSocket(
      () => validateRoomSession('ROOM0001', 'P1', 'secret-token'),
      () => { opened += 1; },
    );
    assert.equal(result.kind, 'unavailable');
    assert.equal(opened, 0);
  }
});

test('malformed validation success is unavailable and does not cause an intermediate socket open', async () => {
  let resolveFetch!: (response: Response) => void;
  globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });
  let opened = 0;
  const pending = validateBeforeOpeningSocket(
    () => validateRoomSession('ROOM0001', 'P1', 'secret-token'),
    () => { opened += 1; },
  );
  assert.equal(opened, 0);
  resolveFetch(jsonResponse({ valid: true, room_id: 'ROOM0001' }));
  const result = await pending;
  assert.deepEqual(result, { kind: 'unavailable', reason: 'malformed-response' });
  assert.equal(opened, 0);
});

test('FastAPI detail.code parsing is machine-readable first and safe for unknown bodies', () => {
  assert.equal(parseSessionValidationErrorCode({ detail: { code: 'SESSION_EXPIRED', message: 'anything' } }), 'SESSION_EXPIRED');
  assert.equal(parseSessionValidationErrorCode({ detail: 'SESSION_EXPIRED' }), null);
  assert.equal(parseSessionValidationErrorCode(null), null);
});
