import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const lobby = readFileSync(new URL('./LobbyPage.tsx', import.meta.url), 'utf8');
const table = readFileSync(new URL('./GameTablePage.tsx', import.meta.url), 'utf8');
const controls = readFileSync(new URL('../components/TurnAlertControls.tsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../components/ui/Modal.tsx', import.meta.url), 'utf8');

test('settings contains only user-facing turn alert, sound, and notification controls', () => {
  assert.match(lobby, /<TurnAlertSettings onNotificationPermissionChanged=/);
  assert.match(controls, /Turn Alerts/);
  assert.match(controls, /Alert Sound/);
  assert.match(controls, /Notifications/);
  assert.match(controls, /Preview<\/Button>/);
  for (const status of ['Enabled', 'Not enabled', 'Blocked', 'Unsupported']) {
    assert.match(controls, new RegExp(status));
  }
});

test('temporary push and browser diagnostic UI is absent', () => {
  for (const text of ['Test Notification', 'Test Browser Notification', 'Browser notification diagnostic', 'Push registration', 'Registered', 'Token ready', 'Sending in']) {
    assert.doesNotMatch(controls, new RegExp(text, 'i'));
  }
  assert.doesNotMatch(lobby, /onTestPushNotification|pushRegistrationStatus/);
});

test('default notification permission keeps a compact explicit enable action', () => {
  assert.match(controls, /status === 'not-enabled'/);
  assert.match(controls, />Enable Notifications<\/Button>/);
  assert.match(controls, /h-11 w-full[^"]*sm:w-auto/);
  assert.match(controls, /await requestNotificationPermission\(\)/);
  assert.match(controls, /onPermissionChanged\?\.\(\)/);
});

test('game table and settings share synchronized preference semantics', () => {
  assert.match(table, /<TurnAlertQuickControl \/>/);
  assert.equal(table.includes('turn-alert-sound'), false);
  assert.equal((controls.match(/updateTurnAlertPreferences\(\{ enabled \}\)/g) ?? []).length, 2);
  assert.match(controls, /role="switch"/);
  assert.match(controls, /aria-checked=\{enabled\}/);
});

test('settings switch keeps a 22px thumb inside its 52x28 track in both states', () => {
  assert.match(controls, /h-7 w-\[52px\] overflow-hidden rounded-full/);
  assert.match(controls, /top-\[3px\] h-\[22px\] w-\[22px\]/);
  assert.match(controls, /enabled \? 'left-\[27px\]' : 'left-\[3px\]'/);
  const track = 52;
  const thumb = 22;
  for (const left of [3, 27]) assert.ok(left >= 0 && left + thumb <= track);
});

test('compact header switch keeps its thumb bounded and a 44px tap target', () => {
  assert.match(controls, /h-5 w-9 overflow-hidden rounded-full/);
  assert.match(controls, /top-0\.5 h-4 w-4/);
  assert.match(controls, /enabled \? 'left-\[18px\]' : 'left-0\.5'/);
  assert.match(controls, /inline-flex h-11 shrink-0/);
  const track = 36;
  const thumb = 16;
  for (const left of [2, 18]) assert.ok(left + thumb <= track);
});

test('narrow settings use bounded grids, full-width controls, and a viewport-safe modal', () => {
  assert.match(controls, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(controls, /grid-cols-1 gap-2 sm:grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(controls, /h-11 w-full min-w-0/);
  assert.doesNotMatch(controls, /min-w-\[(?:[1-9]\d{2,})px\]|translate-x/);
  assert.match(modal, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
  assert.match(modal, /min-h-0 overflow-y-auto overscroll-contain/);
  assert.match(modal, /grid h-11 w-11/);
  assert.match(modal, /overflow-hidden p-3/);
  assert.match(modal, /document\.body\.style\.overflow = 'hidden'/);
});

test('narrow headers hide optional quick-control text before 375px', () => {
  assert.match(controls, /hidden whitespace-nowrap[^"]*min-\[375px\]:inline/);
});
