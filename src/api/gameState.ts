import type { Card, Player, RoomState, TeamId, TrickLeaderState, TrumpState } from '@/types';
import { authoritativeTeamNames } from '../utils/teamNames.ts';

export type BackendGamePhase = 'CREATED' | 'FIRST_PLAYER_SELECTION' | 'DEALING' | 'HIDDEN_TRUMP_SELECTION' | 'HIDDEN_TRUMP_REVEAL' | 'TRUMP_REVEAL_DISPLAY' | 'HIDDEN_CARD_RETURN' | 'PLAYING' | 'TRICK_RESOLUTION' | 'FINAL_SCORE_DISPLAY' | 'GAME_OVER' | 'DRAW';
export type BackendSuit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export interface BackendCard { suit: BackendSuit; rank: number }
export interface BackendTrick { lead_player_id: string | null; lead_suit: BackendSuit | null; played_cards: Array<{ player_id: string; card: BackendCard }>; winner_player_id: string | null; completed: boolean }
export interface BackendCurrentTrickLeader { player_id: string; display_name: string; card: BackendCard }
export interface BackendGameState {
  game_id: string;
  player_count: 4 | 6 | 8;
  players: Array<{ player_id: string; team_id: 'TeamA' | 'TeamB'; seat_index: number; display_name?: string | null; is_online?: boolean }>;
  teams: Record<'TeamA' | 'TeamB', { team_id: 'TeamA' | 'TeamB'; player_ids: string[]; captured_cards: BackendCard[]; tricks_won: number; tens_captured: number }>;
  team_names?: Partial<Record<'TeamA' | 'TeamB', string>>;
  captured_mendis?: Record<'TeamA' | 'TeamB', BackendSuit[]>;
  seat_order: string[];
  hands: Record<string, BackendCard[] | undefined>;
  /**
   * Public playable-hand sizes. The pre-deal setup snapshot deliberately
   * carries an empty map because no player has a playable hand yet.
   */
  hand_counts?: Record<string, number>;
  phase: BackendGamePhase;
  current_turn: string | null;
  current_player_id: string | null;
  current_trick: BackendTrick;
  current_trick_leader: BackendCurrentTrickLeader | null;
  completed_tricks: BackendTrick[];
  trump_state: { status: 'NONE' | 'HIDDEN' | 'PUBLIC'; suit: BackendSuit | null; hidden_rank: number | null; hidden_card_index: number | null; trump_hider_id: string | null };
  hidden_trump_mode: boolean;
  room_id: string;
  room_status: 'GAME_SETUP' | 'IN_GAME';
  host_id: string | null;
  version: number;
  selected_first_player_id?: string | null;
  selected_trump_hider_id?: string | null;
  hidden_hand_positions?: number[] | null;
  returned_to_lobby_player_ids?: string[];
}

export interface AuthoritativeGameState {
  gameId: string;
  phase: BackendGamePhase;
  version: number;
  hand: Card[];
  currentTurn: string | null;
  trick: { leadSuit: Card['suit'] | null; cards: Array<{ playerId: string; card: Card }> };
  currentTrickLeader: TrickLeaderState | null;
  trump: TrumpState;
  scores: Record<TeamId, { name: string; tricks: number; tens: number; capturedMendis: Card['suit'][] }>;
  trickNumber: number;
  totalTricks: number;
  players: Player[];
  winner: TeamId | null;
  trumpHiderId: string | null;
  hiddenCardIndex: number | null;
  selectableHiddenPositions: number[];
  returnedToLobbyPlayerIds: string[];
}

const SUITS: Record<BackendSuit, Card['suit']> = { SPADES: 'spades', HEARTS: 'hearts', DIAMONDS: 'diamonds', CLUBS: 'clubs' };
const BACKEND_SUITS = new Set<BackendSuit>(['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS']);
const RANKS: Record<number, Card['rank']> = { 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const GAME_PHASES = new Set<BackendGamePhase>([
  'CREATED', 'FIRST_PLAYER_SELECTION', 'DEALING', 'HIDDEN_TRUMP_SELECTION',
  'HIDDEN_TRUMP_REVEAL', 'TRUMP_REVEAL_DISPLAY', 'HIDDEN_CARD_RETURN',
  'PLAYING', 'TRICK_RESOLUTION', 'FINAL_SCORE_DISPLAY', 'GAME_OVER', 'DRAW',
]);
const PRE_DEAL_PHASES = new Set<BackendGamePhase>(['CREATED', 'FIRST_PLAYER_SELECTION', 'DEALING']);

function hasValidHandCounts(state: Partial<BackendGameState>): boolean {
  const isPreDeal = PRE_DEAL_PHASES.has(state.phase as BackendGamePhase);
  if (!state.hand_counts || typeof state.hand_counts !== 'object') return isPreDeal;
  if (isPreDeal && Object.keys(state.hand_counts).length === 0) return true;
  return state.seat_order?.every((playerId) => typeof state.hand_counts?.[playerId] === 'number'
    && Number.isInteger(state.hand_counts[playerId]) && state.hand_counts[playerId] >= 0) ?? false;
}

export function isBackendGameState(value: unknown): value is BackendGameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<BackendGameState>;
  return typeof state.game_id === 'string' && (state.player_count === 4 || state.player_count === 6 || state.player_count === 8)
    && typeof state.version === 'number' && Array.isArray(state.seat_order) && state.seat_order.every((playerId) => typeof playerId === 'string')
    && !!state.hands && typeof state.hands === 'object' && GAME_PHASES.has(state.phase as BackendGamePhase)
    && hasValidHandCounts(state)
    && !!state.current_trick && Array.isArray(state.current_trick.played_cards) && Array.isArray(state.completed_tricks)
    && !!state.teams && !!state.trump_state && typeof state.phase === 'string'
    && (state.captured_mendis === undefined || (
      !!state.captured_mendis
      && Array.isArray(state.captured_mendis.TeamA)
      && state.captured_mendis.TeamA.every((suit) => BACKEND_SUITS.has(suit))
      && Array.isArray(state.captured_mendis.TeamB)
      && state.captured_mendis.TeamB.every((suit) => BACKEND_SUITS.has(suit))
    ))
    && (state.current_trick_leader === null || (
      !!state.current_trick_leader
      && typeof state.current_trick_leader.player_id === 'string'
      && typeof state.current_trick_leader.display_name === 'string'
      && !!state.current_trick_leader.card
    ))
    && (state.room_status === 'GAME_SETUP' || state.room_status === 'IN_GAME')
    && (state.returned_to_lobby_player_ids === undefined || (
      Array.isArray(state.returned_to_lobby_player_ids)
      && state.returned_to_lobby_player_ids.every((id) => typeof id === 'string')
    ));
}

function adaptCard(card: BackendCard): Card {
  const suit = SUITS[card.suit];
  const rank = RANKS[card.rank];
  if (!suit || !rank) throw new Error(`Unsupported card ${card.rank} ${card.suit}`);
  return { id: `${card.suit}:${card.rank}`, suit, rank };
}

export function derivePlayableIds(state: AuthoritativeGameState, meId: string): Set<string> {
  if (state.phase !== 'PLAYING' || state.currentTurn !== meId) return new Set();
  const lead = state.trick.leadSuit;
  if (!lead) return new Set(state.hand.map((card) => card.id));
  const following = state.hand.filter((card) => card.suit === lead);
  if (following.length) return new Set(following.map((card) => card.id));
  if (state.trump.kind === 'revealed') {
    const trumpSuit = state.trump.suit;
    const trumps = state.hand.filter((card) => card.suit === trumpSuit);
    if (trumps.length) return new Set(trumps.map((card) => card.id));
  }
  return new Set(state.hand.map((card) => card.id));
}

export function createPlayCardRequest(card: Card) {
  const rank = card.rank === 'A' ? 14 : card.rank === 'K' ? 13 : card.rank === 'Q' ? 12 : card.rank === 'J' ? 11 : Number(card.rank);
  return { action: 'PLAY_CARD', payload: { suit: card.suit.toUpperCase(), rank } } as const;
}

export function canSubmitCard(state: AuthoritativeGameState | null, meId: string, pending: boolean, cardId: string): boolean {
  return !!state && !pending && state.phase === 'PLAYING' && state.currentTurn === meId && derivePlayableIds(state, meId).has(cardId);
}

const GAMEPLAY_ACTIONS = new Set(['PLAY_CARD', 'REVEAL_TRUMP', 'SELECT_TRUMP_HIDER', 'SELECT_HIDDEN_TRUMP', 'COMPLETE_TRUMP_SETUP']);
export function resolveGameplayActionError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const error = payload as Record<string, unknown>;
  if (typeof error.action !== 'string' || !GAMEPLAY_ACTIONS.has(error.action)) return null;
  return typeof error.message === 'string' ? error.message : 'That gameplay action was rejected.';
}

export function adaptGameState(
  state: BackendGameState,
  room: RoomState,
  meId: string,
  previousState?: AuthoritativeGameState | null,
): AuthoritativeGameState {
  const dealt = 48 / state.player_count;
  const roomPlayersById = new Map(room.players.map((player) => [player.id, player]));
  const players: Player[] = state.players.map((player) => {
    const roomPlayer = roomPlayersById.get(player.player_id);
    const isOnline = player.is_online ?? roomPlayer?.connection === 'online';
    return {
      id: player.player_id,
      displayName: player.display_name ?? roomPlayer?.displayName ?? 'Player',
      team: player.team_id === 'TeamA' ? 'A' : 'B',
      seatIndex: player.seat_index,
      isHost: player.player_id === state.host_id,
      isReady: isOnline,
      connection: isOnline ? 'online' : 'offline',
      isCurrentPlayer: player.player_id === meId,
      // Counts are only absent before dealing, when no player has cards to
      // display. Never derive a gameplay count from tricks or deal size.
      cardsRemaining: state.hand_counts?.[player.player_id] ?? 0,
    };
  });
  const trump: TrumpState = state.trump_state.status === 'PUBLIC' && state.trump_state.suit
    ? { kind: 'revealed', suit: SUITS[state.trump_state.suit] }
    : state.trump_state.status === 'HIDDEN' ? { kind: 'hidden', hiderId: state.trump_state.trump_hider_id ?? '' } : { kind: 'none' };
  const teamNames = authoritativeTeamNames(state.team_names, room.teams);
  const previousScores = previousState?.gameId === state.game_id ? previousState.scores : null;
  const capturedMendis = state.captured_mendis
    ? {
        A: state.captured_mendis.TeamA.map((suit) => SUITS[suit]),
        B: state.captured_mendis.TeamB.map((suit) => SUITS[suit]),
      }
    : {
        A: previousScores?.A.capturedMendis ?? [],
        B: previousScores?.B.capturedMendis ?? [],
      };
  const scores = {
    A: { name: teamNames.A, tricks: state.teams.TeamA.tricks_won, tens: state.teams.TeamA.tens_captured, capturedMendis: capturedMendis.A },
    B: { name: teamNames.B, tricks: state.teams.TeamB.tricks_won, tens: state.teams.TeamB.tens_captured, capturedMendis: capturedMendis.B },
  };
  let winner: TeamId | null = null;
  if (state.phase === 'GAME_OVER') winner = scores.A.tens !== scores.B.tens ? (scores.A.tens > scores.B.tens ? 'A' : 'B') : (scores.A.tricks > scores.B.tricks ? 'A' : 'B');
  const leaderPlayer = state.current_trick_leader
    ? players.find((player) => player.id === state.current_trick_leader?.player_id)
    : undefined;
  const currentTrickLeader: TrickLeaderState | null = state.current_trick_leader
    ? {
        playerId: state.current_trick_leader.player_id,
        displayName: state.current_trick_leader.display_name,
        card: adaptCard(state.current_trick_leader.card),
        team: leaderPlayer?.team ?? null,
      }
    : null;
  let selectableHiddenPositions: number[] = [];
  const rawPositions = state.hidden_hand_positions;
  const expectedCount = 48 / state.player_count;
  if (Array.isArray(rawPositions)) {
    const isValid = rawPositions.length === expectedCount
      && rawPositions.every((pos) => typeof pos === 'number' && Number.isInteger(pos) && pos >= 0)
      && new Set(rawPositions).size === rawPositions.length;
    if (isValid) {
      selectableHiddenPositions = rawPositions;
    }
  }

  return {
    gameId: state.game_id, phase: state.phase, version: state.version, hand: (state.hands[meId] ?? []).map(adaptCard), currentTurn: state.current_turn,
    trick: { leadSuit: state.current_trick.lead_suit ? SUITS[state.current_trick.lead_suit] : null, cards: state.current_trick.played_cards.slice(0, state.player_count).map((played) => ({ playerId: played.player_id, card: adaptCard(played.card) })) },
    currentTrickLeader,
    trump, scores, trickNumber: Math.min(state.completed_tricks.length + 1, dealt), totalTricks: dealt, players, winner,
    trumpHiderId: state.trump_state.trump_hider_id, hiddenCardIndex: state.trump_state.hidden_card_index,
    selectableHiddenPositions,
    returnedToLobbyPlayerIds: isStringArray(state.returned_to_lobby_player_ids)
      ? [...state.returned_to_lobby_player_ids]
      : [],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
