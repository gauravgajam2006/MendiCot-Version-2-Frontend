import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  TEAM_NAME_DOUBLE_TAP_WINDOW_MS,
  authoritativeTeamNames,
  createTeamRenameRequest,
  isDoubleTap,
  isTeamRenameConfirmed,
  normalizeTeamName,
  resolveTeamRenameError,
} from './teamNames.ts';

test('authoritative team names use defaults only when a transitional snapshot omits them', () => {
  assert.deepEqual(authoritativeTeamNames(undefined), { A: 'Team Maroon', B: 'Team Gold' });
  assert.deepEqual(authoritativeTeamNames({ TeamA: 'Notorious Squad', TeamB: 'Golden Aces' }), {
    A: 'Notorious Squad',
    B: 'Golden Aces',
  });
});

test('rename requests trim names, use the exact backend contract, and reject duplicates', () => {
  assert.equal(normalizeTeamName('   '), null);
  assert.deepEqual(createTeamRenameRequest(null, '  Notorious Squad  '), {
    action: 'RENAME_TEAM',
    payload: { name: 'Notorious Squad' },
  });
  assert.equal(createTeamRenameRequest('Notorious Squad', 'Another name'), null);
  assert.equal(createTeamRenameRequest(null, '   '), null);
});

test('pending rename clears only when the authoritative own-team name matches', () => {
  assert.equal(isTeamRenameConfirmed('Notorious Squad', 'A', { TeamA: 'Old name' }), false);
  assert.equal(isTeamRenameConfirmed('Notorious Squad', 'A', { TeamA: 'Notorious Squad' }), true);
  assert.equal(isTeamRenameConfirmed('Notorious Squad', 'A', undefined), false);
  assert.equal(isTeamRenameConfirmed(null, 'A', { TeamA: 'Notorious Squad' }), false);
});

test('recoverable backend rename errors remain inline and action-specific', () => {
  assert.equal(resolveTeamRenameError({ action: 'RENAME_TEAM', code: 'TEAM_NAME_TOO_LONG' }, 'Name'), 'That team name is too long.');
  assert.equal(resolveTeamRenameError({ action: 'SWITCH_TEAM', code: 'INVALID_TEAM_NAME' }, 'Name'), null);
  assert.equal(resolveTeamRenameError({ action: 'RENAME_TEAM', code: 'INVALID_PHASE' }, 'Name'), 'Team names cannot be changed right now.');
});

test('single taps do not edit while taps inside the mobile double-tap window do', () => {
  assert.equal(isDoubleTap(null, 100), false);
  assert.equal(isDoubleTap(100, 100 + TEAM_NAME_DOUBLE_TAP_WINDOW_MS), true);
  assert.equal(isDoubleTap(100, 100 + TEAM_NAME_DOUBLE_TAP_WINDOW_MS + 1), false);
});

test('the lobby editor is restricted to the own-team header and supports desktop and mobile entry', () => {
  const lobby = readFileSync(new URL('../screens/LobbyPage.tsx', import.meta.url), 'utf8');
  const editor = readFileSync(new URL('../components/ui/InlineTeamName.tsx', import.meta.url), 'utf8');
  assert.match(lobby, /editable=\{team === me\?\.team\}/);
  assert.match(editor, /onDoubleClick=\{beginEditing\}/);
  assert.match(editor, /onTouchEnd=/);
  assert.match(editor, /onBlur=\{commit\}/);
  assert.match(editor, /event\.key === 'Enter'/);
  assert.match(editor, /event\.key === 'Escape'/);
});

test('custom names are passed through lobby, gameplay HUD, scoreboard, and results without changing team colors', () => {
  const lobby = readFileSync(new URL('../screens/LobbyPage.tsx', import.meta.url), 'utf8');
  const table = readFileSync(new URL('../screens/GameTablePage.tsx', import.meta.url), 'utf8');
  const scoreboard = readFileSync(new URL('../components/game/Scoreboard.tsx', import.meta.url), 'utf8');
  const result = readFileSync(new URL('../screens/GameEndPage.tsx', import.meta.url), 'utf8');
  assert.match(lobby, /name=\{room\.teams\[team\]\}/);
  assert.match(table, /<Scoreboard scores=\{scores\}/);
  assert.match(scoreboard, /name=\{a\.name\}/);
  assert.match(result, /name=\{scores\[p\.team\]\.name\}/);
  assert.match(scoreboard, /text-emerald-300/);
  assert.match(scoreboard, /text-gold-300/);
});
