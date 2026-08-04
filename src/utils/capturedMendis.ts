import type { Suit } from '@/types';

export interface MendiSuitMeta {
  backendValue: 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
  suit: Suit;
  symbol: string;
  readableName: string;
  colorClass: string;
}

export const MENDI_SUIT_ORDER: readonly MendiSuitMeta[] = [
  { backendValue: 'SPADES', suit: 'spades', symbol: '♠', readableName: 'Spades', colorClass: 'text-bone-50' },
  { backendValue: 'HEARTS', suit: 'hearts', symbol: '♥', readableName: 'Hearts', colorClass: 'text-crimson-400' },
  { backendValue: 'DIAMONDS', suit: 'diamonds', symbol: '♦', readableName: 'Diamonds', colorClass: 'text-crimson-400' },
  { backendValue: 'CLUBS', suit: 'clubs', symbol: '♣', readableName: 'Clubs', colorClass: 'text-bone-50' },
] as const;

export function capturedMendiSlots(capturedSuits: readonly Suit[] = []) {
  const captured = new Set(capturedSuits);
  return MENDI_SUIT_ORDER.map((metadata) => ({ ...metadata, captured: captured.has(metadata.suit) }));
}

export function capturedMendisDescription(teamName: string, capturedSuits: readonly Suit[] = []): string {
  const names = capturedMendiSlots(capturedSuits)
    .filter(({ captured }) => captured)
    .map(({ readableName }) => `ten of ${readableName}`);
  if (names.length === 0) return `${teamName} captured no Mendis`;
  if (names.length === 1) return `${teamName} captured ${names[0]}`;
  return `${teamName} captured ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
