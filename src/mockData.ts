import type {
  Card,
  Player,
  PlayerCount,
  Suit,
  TeamId,
  TrumpState,
} from './types';

export const ME_ID = 'p1';

const makeCard = (suit: Suit, rank: Card['rank'], i: number): Card => ({
  id: `c${i}-${suit}-${rank}`,
  suit,
  rank,
});

export const mockHand: Card[] = [
  makeCard('spades', 'A', 1),
  makeCard('spades', 'K', 2),
  makeCard('spades', '10', 3),
  makeCard('spades', '7', 4),
  makeCard('hearts', 'J', 5),
  makeCard('hearts', '9', 6),
  makeCard('hearts', '5', 7),
  makeCard('diamonds', 'Q', 8),
  makeCard('diamonds', '8', 9),
  makeCard('clubs', 'K', 10),
  makeCard('clubs', '10', 11),
  makeCard('clubs', '6', 12),
  makeCard('clubs', '2', 13),
];

// Which cards in mockHand are playable this turn (mock rule: must follow hearts)
export const mockPlayableIds = new Set<string>([
  'c5-hearts-J',
  'c6-hearts-9',
  'c7-hearts-5',
]);

export const mockTrump: TrumpState = { kind: 'revealed', suit: 'spades' };

export const mockTrumpHidden: TrumpState = { kind: 'hidden', hiderId: 'p1' };

export const mockTrick: {
  leadSuit: Suit | null;
  currentPlayerId: string;
  cards: { playerId: string; card: Card }[];
} = {
  leadSuit: 'hearts' as Suit,
  currentPlayerId: 'p1',
  cards: [
    { playerId: 'p3', card: makeCard('hearts', 'Q', 100) },
    { playerId: 'p4', card: makeCard('hearts', '7', 101) },
  ],
};

export const mockScores: Record<TeamId, { name: string; tricks: number; tens: number }> = {
  A: { name: 'Team Maroon', tricks: 3, tens: 1 },
  B: { name: 'Team Gold', tricks: 2, tens: 0 },
};

const PLAYER_NAMES = ['You', 'Aarav', 'Priya', 'Kabir', 'Ishaan', 'Meera', 'Rohan', 'Anaya', 'Vikram', 'Sara'];

export function generatePlayers(count: PlayerCount): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    displayName: PLAYER_NAMES[i] ?? `Player ${i + 1}`,
    team: i % 2 === 0 ? 'A' : 'B',
    seatIndex: i,
    isHost: i === 0,
    isReady: true,
    connection: 'online' as const,
    isCurrentPlayer: i === 0,
    cardsRemaining: Math.floor(52 / count),
  }));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function teamHue(team: TeamId): string {
  return team === 'A' ? 'emerald' : 'gold';
}
