import { Check, Crown } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { TeamBadge } from '@/components/ui/TeamBadge';
import type { BackendGamePhase } from '@/api';
import type { Player, RoomState } from '@/types';

interface HostSetupPageProps {
  room: RoomState;
  meId: string;
  phase: BackendGamePhase | null;
  firstPlayerPending: boolean;
  cancelPending: boolean;
  actionMessage: string | null;
  trumpHiderId: string | null;
  trumpHiderPending: boolean;
  gameplayMessage: string | null;
  onSelectTrumpHider: (playerId: string) => void;
  onSelectFirstPlayer: (playerId: string) => void;
  onCancel: () => void;
}

export function HostSetupPage({
  room,
  meId,
  phase,
  firstPlayerPending,
  cancelPending,
  actionMessage,
  trumpHiderId,
  trumpHiderPending,
  gameplayMessage,
  onSelectTrumpHider,
  onSelectFirstPlayer,
  onCancel,
}: HostSetupPageProps) {
  const isHost = room.hostId === meId;
  const isSelectingFirstPlayer = phase === 'FIRST_PLAYER_SELECTION';
  const needsTrumpHider = room.config.trumpMode === 'hidden' && !trumpHiderId;
  const canCancel = isHost && room.status === 'GAME_SETUP' && isSelectingFirstPlayer;

  return (
    <div className="min-h-screen">
      <TopBar
        right={
          <span className="inline-flex items-center gap-1 text-2xs uppercase tracking-[0.14em] text-gold-400">
            {isHost && <Crown size={12} />} {isHost ? 'Host setup' : 'Setup in progress'}
          </span>
        }
      />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 animate-fade-up">
          <span className="label-eyebrow text-emerald-400">Game ceremony</span>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-brand text-bone-50 sm:text-3xl">
            {isSelectingFirstPlayer ? (needsTrumpHider ? 'Who hides the trump?' : 'Who plays first?') : 'Preparing the table'}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-bone-300">
            {isSelectingFirstPlayer
              ? isHost
                ? needsTrumpHider ? 'Select the player who will secretly choose trump.' : 'Select the player who will take the opening lead.'
                : needsTrumpHider ? 'Waiting for the host to choose the trump hider.' : 'Waiting for the host to choose the first player.'
              : 'Waiting for the next authoritative setup update.'}
          </p>
        </div>

        {(actionMessage || gameplayMessage) && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-crimson-500/40 bg-crimson-500/10 px-4 py-3 text-sm text-crimson-400"
          >
            {actionMessage ?? gameplayMessage}
          </p>
        )}

        {isSelectingFirstPlayer && isHost ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {room.players.map((player) => (
              <SelectablePlayer
                key={player.id}
                player={player}
                teamName={room.teams[player.team]}
                isMe={player.id === meId}
                disabled={firstPlayerPending || trumpHiderPending || cancelPending}
                onClick={() => needsTrumpHider ? onSelectTrumpHider(player.id) : onSelectFirstPlayer(player.id)}
              />
            ))}
          </div>
        ) : (
          <div className="surface-raised p-5 text-sm text-bone-300">
            {isSelectingFirstPlayer
              ? 'The host will choose the opening player for everyone.'
              : 'Synchronizing the next setup phase for all players.'}
          </div>
        )}

        {canCancel && (
          <div className="mt-8 flex justify-start">
            <Button variant="ghost" onClick={onCancel} disabled={cancelPending || firstPlayerPending} loading={cancelPending}>
              {cancelPending ? 'Cancelling…' : 'Back'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectablePlayer({
  player,
  teamName,
  isMe,
  disabled,
  onClick,
}: {
  player: Player;
  teamName: string;
  isMe: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative flex flex-col items-center gap-2.5 rounded-xl border border-ink-600 bg-ink-900 p-4 transition-all no-tap-highlight focus-ring hover:border-ink-500 hover:bg-ink-850 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Avatar name={player.displayName} team={player.team} size="lg" online={player.connection === 'online'} />
      <div className="text-center">
        <p className="text-sm font-medium text-bone-100">{player.displayName}{isMe ? ' (You)' : ''}</p>
        <div className="mt-1">
          <TeamBadge team={player.team} name={teamName} />
        </div>
      </div>
      <Check size={14} className="absolute right-2 top-2 text-emerald-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
