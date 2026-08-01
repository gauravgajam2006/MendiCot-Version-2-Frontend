// Shared domain types for the MendiCot frontend.
// These are shaped like future real-time backend payloads so components
// can be wired to a live state source without redesign.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank =
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | '10'
  | '9'
  | '8'
  | '7'
  | '6'
  | '5'
  | '4'
  | '3'
  | '2';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type TeamId = 'A' | 'B';

export type PlayerCount = 4 | 6 | 8;

export type TrumpMode = 'normal' | 'hidden';

export type RoomStatus = 'WAITING' | 'IN_GAME';

export type ConnectionStatus = 'online' | 'offline' | 'connecting';

export interface Player {
  id: string;
  displayName: string;
  team: TeamId;
  seatIndex: number; // 0-based position around the table
  isHost: boolean;
  isReady: boolean;
  connection: ConnectionStatus;
  isCurrentPlayer: boolean;
  cardsRemaining?: number;
  isTrumpHider?: boolean;
  isStartingPlayer?: boolean;
}

export interface TeamScore {
  team: TeamId;
  name: string;
  tricks: number;
  tens: number;
}

export type TrumpState =
  | { kind: 'none' }
  | { kind: 'hidden'; hiderId: string }
  | { kind: 'revealed'; suit: Suit }
  | { kind: 'created'; suit: Suit };

export interface PlayedCard {
  playerId: string;
  card: Card;
}

export interface TrickState {
  leadSuit: Suit | null;
  cards: PlayedCard[];
  currentPlayerId: string;
}

export type GameScreen =
  | 'landing'
  | 'resume'
  | 'create'
  | 'join'
  | 'lobby'
  | 'host-setup'
  | 'hidden-trump'
  | 'game'
  | 'game-end';

export interface RoomConfig {
  code: string;
  playerCount: PlayerCount;
  trumpMode: TrumpMode;
}

export interface RoomState {
  status: RoomStatus;
  config: RoomConfig;
  players: Player[];
  hostId: string;
  teams: Record<TeamId, string>; // team id -> team name
}

export interface ToastMessage {
  id: string;
  kind: 'error' | 'info' | 'success' | 'warning';
  title: string;
  description?: string;
}

export type ReconnectState = 'connected' | 'reconnecting' | 'offline';

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_NAME: Record<Suit, string> = {
  spades: 'Spades',
  hearts: 'Hearts',
  diamonds: 'Diamonds',
  clubs: 'Clubs',
};

export const SUIT_IS_RED: Record<Suit, boolean> = {
  spades: false,
  hearts: true,
  diamonds: true,
  clubs: false,
};

export const TEAM_COLOR: Record<TeamId, string> = {
  A: 'emerald',
  B: 'gold',
};

export const TEAM_LABEL: Record<TeamId, string> = {
  A: 'Team Maroon',
  B: 'Team Gold',
};

// Rank ordering for display (not full game ranking, just visual order)
export const RANK_ORDER: Rank[] = [
  'A',
  'K',
  'Q',
  'J',
  '10',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
];
