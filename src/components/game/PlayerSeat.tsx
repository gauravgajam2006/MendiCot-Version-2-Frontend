import type { Player } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Crown } from 'lucide-react';

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn?: boolean;
  isMe?: boolean;
  size?: 'sm' | 'md';
  showCardsRemaining?: boolean;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  label?: string;
  variant?: 'stacked' | 'inline';
}

export function PlayerSeat({
  player,
  isCurrentTurn,
  isMe,
  size = 'sm',
  showCardsRemaining,
  onClick,
  selected,
  disabled,
  label,
  variant = 'stacked',
}: PlayerSeatProps) {
  const interactive = onClick !== undefined && !disabled;
  const teamText = player.team === 'A' ? 'text-emerald-300' : 'text-gold-300';
  const teamDot = player.team === 'A' ? 'bg-emerald-400' : 'bg-gold-400';
  const nameColor = player.connection === 'offline' ? 'text-bone-400' : 'text-bone-100';
  const avatarRing = isCurrentTurn
    ? 'ring-2 ring-emerald-400/60 ring-offset-2 ring-offset-ink-950 rounded-full'
    : '';

  const identity = (
    <div
      className={[
        variant === 'inline'
          ? 'flex flex-col items-start gap-0.5 text-left min-w-0'
          : 'flex flex-col items-center gap-0.5 text-center',
        'min-w-0',
      ].join(' ')}
    >
      <span className={['text-xs font-medium max-w-[6.5rem] sm:max-w-[7rem] truncate', nameColor].join(' ')}>
        {player.displayName}{isMe ? ' (You)' : ''}
      </span>
      {showCardsRemaining && (
        <span className="text-2xs text-bone-400 tabular-nums">{player.cardsRemaining ?? 0} cards</span>
      )}
      {label && <span className="text-2xs text-emerald-300">{label}</span>}
      <span className={['inline-flex items-center gap-1 text-2xs uppercase tracking-[0.1em]', teamText].join(' ')}>
        <span className={['h-1.5 w-1.5 rounded-full', teamDot].join(' ')} />
        {player.team === 'A' ? 'Maroon' : 'Gold'}
      </span>
    </div>
  );

  return (
    <div
      className={[
        'group relative flex rounded-xl transition-all duration-200 no-tap-highlight min-w-0',
        variant === 'inline' ? 'flex-row items-center gap-2 px-2 py-1.5' : 'flex-col items-center gap-1.5 px-2 py-2',
        interactive ? 'cursor-pointer hover:bg-ink-800/60 focus-ring' : 'cursor-default',
        selected ? 'bg-emerald-900/40 ring-1 ring-emerald-400/50' : '',
        isCurrentTurn ? 'shadow-turn' : '',
      ].join(' ')}
    >
      {player.isHost && (
        <span className="absolute -top-1 -right-1 text-gold-400" title="Host">
          <Crown size={13} />
        </span>
      )}
      <Avatar
        name={player.displayName}
        team={player.team}
        size={size === 'sm' ? 'sm' : 'md'}
        online={player.connection === 'online'}
        className={avatarRing}
      />
      {identity}
      {player.connection === 'offline' && (
        <span className="absolute inset-0 grid place-items-center rounded-xl bg-ink-950/40">
          <span className="text-2xs text-bone-400 uppercase tracking-wider">Offline</span>
        </span>
      )}
    </div>
  );
}
