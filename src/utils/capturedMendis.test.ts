import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { capturedMendiSlots, capturedMendisDescription, MENDI_SUIT_ORDER } from './capturedMendis.ts';
import type { Suit } from '../types.ts';

test('Mendi slots always use fixed spades, hearts, diamonds, clubs order', () => {
  assert.deepEqual(MENDI_SUIT_ORDER.map(({ backendValue }) => backendValue), ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']);
  assert.deepEqual(MENDI_SUIT_ORDER.map(({ symbol }) => symbol), ['♠', '♥', '♦', '♣']);
});

test('empty Mendis render four placeholder positions', () => {
  assert.deepEqual(capturedMendiSlots().map(({ captured }) => captured), [false, false, false, false]);
});

for (const [suit, expected] of [
  ['spades', [true, false, false, false]],
  ['hearts', [false, true, false, false]],
  ['diamonds', [false, false, true, false]],
  ['clubs', [false, false, false, true]],
] as const) {
  test(`captured ten of ${suit} replaces only its fixed placeholder`, () => {
    assert.deepEqual(capturedMendiSlots([suit]).map(({ captured }) => captured), expected);
  });
}

test('multiple and all captured suits preserve fixed slots', () => {
  assert.deepEqual(capturedMendiSlots(['hearts', 'clubs']).map(({ captured }) => captured), [false, true, false, true]);
  assert.deepEqual(capturedMendiSlots(['clubs', 'diamonds', 'hearts', 'spades']).map(({ captured }) => captured), [true, true, true, true]);
});

test('red and light suit styling follows card suits rather than team colors', () => {
  assert.deepEqual(MENDI_SUIT_ORDER.map(({ colorClass }) => colorClass), [
    'text-bone-50', 'text-crimson-400', 'text-crimson-400', 'text-bone-50',
  ]);
});

test('accessible descriptions identify ownership and captured tens', () => {
  assert.equal(capturedMendisDescription('Notorious Squad'), 'Notorious Squad captured no Mendis');
  assert.equal(
    capturedMendisDescription('Notorious Squad', ['spades', 'diamonds']),
    'Notorious Squad captured ten of Spades and ten of Diamonds',
  );
});

test('scoreboard keeps four constrained Mendis slots inside a wider metric column', () => {
  const scoreboard = readFileSync(new URL('../components/game/Scoreboard.tsx', import.meta.url), 'utf8');
  const component = readFileSync(new URL('../components/game/CapturedMendisSlots.tsx', import.meta.url), 'utf8');
  assert.equal(scoreboard.includes('label="Tens"'), false);
  assert.match(scoreboard, /label="Mendis"/);
  assert.match(scoreboard, /CapturedMendisSlots/);
  assert.match(scoreboard, /MetricColumn/);
  assert.match(scoreboard, /grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.2fr\)\]/);
  assert.match(scoreboard, /grid-rows-\[1\.75rem_auto\]/);
  assert.match(scoreboard, /compact \? 'gap-2' : 'gap-3'/);
  assert.match(component, /grid-cols-\[repeat\(4,minmax\(0,1fr\)\)\]/);
  assert.match(component, /whitespace-nowrap/);
  assert.match(component, /w-full max-w-full/);
  assert.equal(component.includes('w-[4.25rem]'), false);
  assert.equal(component.includes('w-20'), false);
  assert.match(component, /text-xs sm:text-sm/);
  assert.match(component, /captured \? symbol : '·'/);
  assert.match(component, /aria-label=\{capturedMendisDescription/);
});

test('game table has no duplicate captured-tens panel after the scoreboard slots are introduced', () => {
  const table = readFileSync(new URL('../screens/GameTablePage.tsx', import.meta.url), 'utf8');
  assert.equal(table.includes('CapturedTensPanel'), false);
  assert.equal(table.includes('Captured Tens (Mendis)'), false);
  assert.match(table, /<Scoreboard scores=\{scores\} compact \/>/);
});

test('result summary uses the same constrained Mendis slots instead of a numeric Tens metric', () => {
  const result = readFileSync(new URL('../screens/GameEndPage.tsx', import.meta.url), 'utf8');
  assert.match(result, /CapturedMendisSlots/);
  assert.match(result, /label="Mendis"/);
  assert.match(result, /grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,1\.2fr\)\]/);
  assert.match(result, /grid-rows-\[1\.75rem_auto\]/);
  assert.equal(result.includes('>Tens<'), false);
  assert.equal(result.includes('Target'), false);
});

test('slot utility accepts every frontend suit without affecting player-count layouts', () => {
  for (const playerCount of [4, 6, 8]) {
    const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
    assert.equal(capturedMendiSlots(suits).length, 4, `${playerCount}-player scoreboard`);
  }
});
