import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('./PostGameLobbyPage.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const button = readFileSync(new URL('../components/ui/Button.tsx', import.meta.url), 'utf8');
const statusUtil = readFileSync(new URL('../utils/returnToLobby.ts', import.meta.url), 'utf8');

test('post-game lobby shows the room code, waiting message, and returned count', () => {
  assert.match(page, /<RoomCodeDisplay code=\{roomCode\} size="md" \/>/);
  assert.match(page, /Waiting for other players to return before the next game can start\./);
  assert.match(page, /\{inLobbyCount\} of \{totalCount\} players are in the lobby/);
  assert.match(page, /role="status"/);
  assert.match(page, /aria-live="polite"/);
});

test('post-game lobby supports 4, 6, and 8 player counts without hardcoded totals', () => {
  assert.match(page, /seatsPerTeam = Math\.ceil\(totalCount \/ 2\)/);
  assert.equal(page.includes('4 of'), false);
  assert.equal(page.includes('playerCount === 4'), false);
});

test('status derivation exposes In Lobby, Still in the Game, and Offline labels', () => {
  assert.match(statusUtil, /'in-lobby': 'In Lobby'/);
  assert.match(statusUtil, /'still-in-game': 'Still in the Game'/);
  assert.match(statusUtil, /offline: 'Offline'/);
  assert.match(page, /RETURN_TO_LOBBY_STATUS_LABELS\[status\]/);
  assert.match(page, /deriveReturnToLobbyStatus/);
});

test('offline takes visual priority through the derived status', () => {
  assert.match(statusUtil, /if \(player\.connection === 'offline'\) return 'offline';/);
  assert.match(page, /isOffline \? 'border-ink-700 bg-ink-900\/60 opacity-70'/);
});

test('post-game lobby has no Start Game, team switching, team renaming, create, or join actions', () => {
  assert.equal(page.includes('Start Game'), false);
  assert.equal(page.includes('onSwitchTeam'), false);
  assert.equal(page.includes('onRenameTeam'), false);
  assert.equal(page.includes('RENAME_TEAM'), false);
  assert.equal(page.includes('SWITCH_TEAM'), false);
  assert.equal(page.includes('Create Room'), false);
  assert.equal(page.includes('Join Room'), false);
});

test('Leave Table remains available as a full-width touch target on mobile', () => {
  assert.match(page, /onLeave/);
  assert.match(page, /Leave Table/);
  assert.match(page, /size="lg"/);
  assert.match(page, /fullWidth/);
  assert.match(page, /sm:w-auto sm:min-w-52/);
  assert.match(button, /h-13/);
});

test('post-game player rows stay readable and non-overflowing on narrow screens', () => {
  assert.match(page, /flex min-w-0 items-center gap-3/);
  assert.match(page, /min-w-0 flex-1/);
  assert.match(page, /break-words/);
  assert.match(page, /whitespace-nowrap/);
  assert.match(page, /shrink-0/);
  assert.equal(page.includes('overflow-x'), false);
  assert.equal(page.includes('overflow-x-auto'), false);
});

test('desktop and tablet layout use the shared centered panel with safe edge padding', () => {
  assert.match(page, /max-w-4xl/);
  assert.match(page, /px-4 sm:px-6/);
  assert.match(page, /grid grid-cols-1 md:grid-cols-2 gap-4/);
});

test('App routes only a returned client to the post-game lobby and renders it', () => {
  assert.match(app, /import \{ PostGameLobbyPage \} from '@\/screens\/PostGameLobbyPage';/);
  assert.match(app, /screen === 'post-game-lobby' && gameState/);
  assert.match(app, /screenForAuthoritativeState\(gameState\.room_status, gameState\.phase, session\.playerId, returnedIds\)/);
});

test('App clears the return pending state from the authoritative returned ids, without optimistic routing', () => {
  assert.match(app, /isPlayerReturnedToLobby\(session\.playerId, returnedIds\)/);
  assert.equal(app.includes('Returning everyone to the lobby'), false);
});

test('App clears the terminal and returned state only when the room reaches WAITING', () => {
  assert.match(app, /if \(authoritativeStatus === 'WAITING'\) \{/);
  assert.match(app, /setReturnedToLobbyPlayerIds\(\[\]\)/);
  assert.match(app, /setGameState\(null\)/);
});
