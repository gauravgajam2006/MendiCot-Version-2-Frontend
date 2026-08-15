import type { Card, Rank, Suit } from '@/types';

/**
 * Root base path for the Stranger Things inspired deck assets.
 * Assets placed in Vite's public/ folder are served from the root URL path.
 */
export const STRANGER_THINGS_DECK_BASE = '/deck/mendicot-stranger-things-deck';
export const STRANGER_THINGS_CARDS_DIR = `${STRANGER_THINGS_DECK_BASE}/cards`;

/**
 * URL path for the custom card-back asset.
 */
export const CARD_BACK_IMAGE_URL = `${STRANGER_THINGS_DECK_BASE}/card-back.png`;

/**
 * 48-card Mendicot deck ranks in ascending order (standard Mendicot deck excludes 2s).
 */
export const MENDICOT_RANKS: readonly Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
] as const;

/**
 * Supported suits in Mendicot.
 */
export const MENDICOT_SUITS: readonly Suit[] = [
  'spades',
  'hearts',
  'clubs',
  'diamonds',
] as const;

/**
 * Map of Suit name to single-letter asset filename code:
 * spades -> S
 * hearts -> H
 * clubs -> C
 * diamonds -> D
 */
export const SUIT_TO_CODE: Record<Suit, string> = {
  spades: 'S',
  hearts: 'H',
  clubs: 'C',
  diamonds: 'D',
};

/**
 * Map of single-letter asset filename code back to Suit name.
 */
export const CODE_TO_SUIT: Record<string, Suit> = {
  S: 'spades',
  H: 'hearts',
  C: 'clubs',
  D: 'diamonds',
};

export type CardIdentifier = Pick<Card, 'suit' | 'rank'>;

/**
 * Returns the expected asset filename for a card (e.g., "3S.png", "10H.png", "JD.png", "AC.png").
 */
export function getCardAssetFilename(card: CardIdentifier): string {
  const suitCode = SUIT_TO_CODE[card.suit];
  return `${card.rank}${suitCode}.png`;
}

/**
 * Returns the public URL path for a face-up card image.
 * e.g. "/deck/mendicot-stranger-things-deck/cards/10H.png"
 */
export function getCardImageUrl(card: CardIdentifier): string {
  return `${STRANGER_THINGS_CARDS_DIR}/${getCardAssetFilename(card)}`;
}

/**
 * Returns the public URL path for the custom card-back image.
 * e.g. "/deck/mendicot-stranger-things-deck/card-back.png"
 */
export function getCardBackImageUrl(): string {
  return CARD_BACK_IMAGE_URL;
}

/**
 * Returns an array of all 48 expected card asset filenames in the deck.
 */
export function getMendicot48CardFilenames(): string[] {
  const filenames: string[] = [];
  for (const suit of MENDICOT_SUITS) {
    for (const rank of MENDICOT_RANKS) {
      filenames.push(getCardAssetFilename({ suit, rank }));
    }
  }
  return filenames;
}

/**
 * Validates whether a given card identifier belongs to the 48-card Mendicot deck.
 */
export function isMendicot48Card(card: CardIdentifier): boolean {
  return (
    MENDICOT_SUITS.includes(card.suit) &&
    MENDICOT_RANKS.includes(card.rank)
  );
}
