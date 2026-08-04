import type { Player, PlayerCount, TeamId } from '@/types';

export type SeatPosition = 'top' | 'left' | 'right' | 'bottom';

export interface RemoteTablePosition {
  player: Player;
  relativeSeat: number;
  position: Exclude<SeatPosition, 'bottom'>;
}

export interface RelativeSeating {
  currentPlayer: Player | null;
  remotePositions: RemoteTablePosition[];
}

// Visual positions are assigned in relative-seat order (0 = bottom = "me").
// The local player is always anchored at the bottom; opponents are
// distributed around the remaining sides, balanced so no side holds
// more than 2 players when possible (8-player games put 3 on top,
// which has the most horizontal room).
//
//   4 players: 1 bottom, 1 left, 1 top, 1 right
//   6 players: 1 bottom, 2 left, 2 top, 1 right
//   8 players: 1 bottom, 2 left, 3 top, 2 right
export function getSeatPositions(count: 4 | 6 | 8): SeatPosition[] {
  if (count === 4) return ['bottom', 'left', 'top', 'right'];
  if (count === 6) return ['bottom', 'left', 'left', 'top', 'top', 'right'];
  return ['bottom', 'left', 'left', 'top', 'top', 'top', 'right', 'right'];
}

/**
 * Rotates authoritative seats into the current browser's perspective.
 * Relative seat zero is local-only; every returned remote player is ordered
 * clockwise from relative seat 1 through playerCount - 1.
 */
export function getRelativeSeating(
  players: readonly Player[],
  currentPlayerId: string,
  configuredPlayerCount: PlayerCount,
): RelativeSeating {
  const currentPlayer = players.find((player) => player.id === currentPlayerId) ?? null;
  if (!currentPlayer) return { currentPlayer: null, remotePositions: [] };

  const positions = getSeatPositions(configuredPlayerCount);
  const seenPlayerIds = new Set<string>([currentPlayerId]);
  const remotePositions = players
    .filter((player) => {
      if (seenPlayerIds.has(player.id)) return false;
      seenPlayerIds.add(player.id);
      return true;
    })
    .map((player) => ({
      player,
      relativeSeat: (
        (player.seatIndex - currentPlayer.seatIndex) % configuredPlayerCount
        + configuredPlayerCount
      ) % configuredPlayerCount,
    }))
    .filter((seat) => seat.relativeSeat !== 0)
    .sort((a, b) => a.relativeSeat - b.relativeSeat)
    .map(({ player, relativeSeat }) => ({
      player,
      relativeSeat,
      position: positions[relativeSeat] as Exclude<SeatPosition, 'bottom'>,
    }));

  return { currentPlayer, remotePositions };
}

export const TEAM_ACCENT: Record<TeamId, { text: string; bg: string; ring: string; bar: string; dot: string; label: string }> = {
  A: {
    text: 'text-emerald-300',
    bg: 'bg-emerald-900/25',
    ring: 'ring-emerald-400/40',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-400',
    label: 'Team Maroon',
  },
  B: {
    text: 'text-gold-300',
    bg: 'bg-gold-700/15',
    ring: 'ring-gold-400/40',
    bar: 'bg-gold-500',
    dot: 'bg-gold-400',
    label: 'Team Gold',
  },
};
