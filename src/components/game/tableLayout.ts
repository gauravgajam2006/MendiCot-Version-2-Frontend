import type { TeamId } from '@/types';

export type SeatPosition = 'top' | 'left' | 'right' | 'bottom';

// Seat positions are assigned in seatIndex order (0 = bottom = "me").
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
  if (count === 6) return ['bottom', 'left', 'top', 'right', 'left', 'top'];
  return ['bottom', 'left', 'top', 'right', 'left', 'top', 'top', 'right'];
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
