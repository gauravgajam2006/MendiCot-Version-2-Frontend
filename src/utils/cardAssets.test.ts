import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CARD_BACK_IMAGE_URL,
  CODE_TO_SUIT,
  getCardAssetFilename,
  getCardBackImageUrl,
  getCardImageUrl,
  getMendicot48CardFilenames,
  isMendicot48Card,
  MENDICOT_RANKS,
  MENDICOT_SUITS,
  STRANGER_THINGS_CARDS_DIR,
  STRANGER_THINGS_DECK_BASE,
  SUIT_TO_CODE,
} from './cardAssets.ts';
import type { Card } from '../types.ts';

test('deck base paths point to the Stranger Things public directory', () => {
  assert.equal(STRANGER_THINGS_DECK_BASE, '/deck/mendicot-stranger-things-deck');
  assert.equal(STRANGER_THINGS_CARDS_DIR, '/deck/mendicot-stranger-things-deck/cards');
  assert.equal(CARD_BACK_IMAGE_URL, '/deck/mendicot-stranger-things-deck/card-back.png');
  assert.equal(getCardBackImageUrl(), '/deck/mendicot-stranger-things-deck/card-back.png');
});

test('suit code mapping maps all four suits accurately to single letters', () => {
  assert.equal(SUIT_TO_CODE.spades, 'S');
  assert.equal(SUIT_TO_CODE.hearts, 'H');
  assert.equal(SUIT_TO_CODE.clubs, 'C');
  assert.equal(SUIT_TO_CODE.diamonds, 'D');

  for (const suit of MENDICOT_SUITS) {
    const code = SUIT_TO_CODE[suit];
    assert.equal(CODE_TO_SUIT[code], suit);
  }
});

test('card asset filenames match expected naming convention (e.g. 3S.png, 10H.png, JD.png, AC.png)', () => {
  assert.equal(getCardAssetFilename({ suit: 'spades', rank: '3' }), '3S.png');
  assert.equal(getCardAssetFilename({ suit: 'spades', rank: '4' }), '4S.png');
  assert.equal(getCardAssetFilename({ suit: 'hearts', rank: '10' }), '10H.png');
  assert.equal(getCardAssetFilename({ suit: 'diamonds', rank: 'J' }), 'JD.png');
  assert.equal(getCardAssetFilename({ suit: 'clubs', rank: 'A' }), 'AC.png');
});

test('getCardImageUrl generates correct public URLs for face-up cards', () => {
  const card: Card = { id: 'card-1', suit: 'hearts', rank: '10' };
  assert.equal(getCardImageUrl(card), '/deck/mendicot-stranger-things-deck/cards/10H.png');
  assert.equal(getCardImageUrl({ suit: 'spades', rank: 'A' }), '/deck/mendicot-stranger-things-deck/cards/AS.png');
});

test('48-card Mendicot deck contains exactly 12 ranks per suit and excludes 2s', () => {
  const filenames = getMendicot48CardFilenames();
  assert.equal(filenames.length, 48);

  assert.equal(MENDICOT_RANKS.length, 12);
  assert.equal(MENDICOT_RANKS.includes('2' as unknown as typeof MENDICOT_RANKS[number]), false);
  assert.equal(MENDICOT_SUITS.length, 4);

  // Ensure no rank 2 filenames
  for (const filename of filenames) {
    assert.equal(filename.startsWith('2'), false);
  }
});

test('isMendicot48Card validates 48-card deck membership correctly', () => {
  assert.equal(isMendicot48Card({ suit: 'spades', rank: '3' }), true);
  assert.equal(isMendicot48Card({ suit: 'hearts', rank: 'A' }), true);
  assert.equal(isMendicot48Card({ suit: 'clubs', rank: '2' as unknown as typeof MENDICOT_RANKS[number] }), false);
});
