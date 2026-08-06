import { Crown, LogOut, Hourglass, Check } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { RoomCodeDisplay } from '@/components/ui/RoomCodeDisplay';
import { Avatar } from '@/components/ui/Avatar';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import {
  countPlayersInPostGameLobby,
  deriveReturnToLobbyStatus,
  RETURN_TO_LOBBY_STATUS_LABELS,
  type ReturnToLobbyStatus,
} from '@/utils/returnToLobby';
import type { Player, TeamId } from '@/types';

interface PostGameLobbyPageProps {
  roomCode: string;
  players: Player[];
  meId: string;
  returnedToLobbyPlayerIds: string[];
  teamNames: Record<TeamId, string>;
  onLeave: () => void;
}

const STATUS_STYLE: Record<ReturnToLobbyStatus, string> = {
  'in-lobby': 'text-emerald-300',
  'still-in-game': 'text-gold-300',
  offline: 'text-bone-400',
};

export function PostGameLobbyPage({
  roomCode,
  players,
  meId,
  returnedToLobbyPlayerIds,
  teamNames,
  onLeave,
}: PostGameLobbyPageProps) {
  const me = players.find((p) => p.id === meId);
  const isHost = me?.isHost ?? false;
  const inLobbyCount = countPlayersInPostGameLobby(players, returnedToLobbyPlayerIds);
  const totalCount = players.length;
  const teamPlayers = (team: TeamId) => players.filter((p) => p.team === team);
  const seatsPerTeam = Math.ceil(totalCount / 2);

  return (
    <div className="min-h-screen">
      <TopBar
        onBack={onLeave}
        right={
          <Button variant="ghost" size="sm" onClick={onLeave}>
            <LogOut size={15} /> Leave
          </Button>
        }
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-6 text-center animate-fade-up sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div className="min-w-0">
            <span className="label-eyebrow text-gold-400">Post-game lobby</span>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-brand text-bone-50">
              Waiting for the next game
            </h1>
            <p
              role="status"
              className="mt-3 text-bone-300"
              aria-live="polite"
            >
              Waiting for other players to return before the next game can start.
            </p>
            <p className="mt-2 text-sm text-bone-400" role="status" aria-live="polite">
              {inLobbyCount} of {totalCount} players are in the lobby
            </p>
          </div>
          <div className="shrink-0">
            <RoomCodeDisplay code={roomCode} size="md" />
          </div>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['A', 'B'] as TeamId[]).map((team) => (
            <div key={team} className="surface-raised overflow-hidden">
              <div
                className={[
                  'flex items-center justify-between border-b hairline px-4 py-3',
                  team === 'A' ? 'bg-emerald-900/20' : 'bg-gold-700/15',
                ].join(' ')}
              >
                <span className="font-display text-sm font-semibold text-bone-50">{teamNames[team]}</span>
                <span className="text-2xs text-bone-400 uppercase tracking-wider">
                  {teamPlayers(team).length} / {seatsPerTeam} seated
                </span>
              </div>
              <div className="p-3 space-y-2">
                {teamPlayers(team).map((p) => (
                  <PostGamePlayerRow
                    key={p.id}
                    player={p}
                    meId={meId}
                    returnedToLobbyPlayerIds={returnedToLobbyPlayerIds}
                  />
                ))}
                {Array.from({ length: Math.max(0, seatsPerTeam - teamPlayers(team).length) }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center gap-3 rounded-lg border border-dashed border-ink-600 px-3 py-2.5 text-bone-500"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-ink-500">
                      <Hourglass size={14} />
                    </div>
                    <span className="text-sm">Awaiting return</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Leave */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            className="sm:w-auto sm:min-w-52"
            onClick={onLeave}
          >
            <LogOut size={16} /> Leave Table
          </Button>
        </div>

        {isHost && (
          <p className="mt-6 text-center text-sm text-bone-400">
            The game will restart once every remaining player has returned.
          </p>
        )}
      </div>
    </div>
  );
}

function PostGamePlayerRow({
  player,
  meId,
  returnedToLobbyPlayerIds,
}: {
  player: Player;
  meId: string;
  returnedToLobbyPlayerIds: string[];
}) {
  const status = deriveReturnToLobbyStatus(player, returnedToLobbyPlayerIds);
  const isOffline = player.connection === 'offline';
  const statusLabel = RETURN_TO_LOBBY_STATUS_LABELS[status];

  return (
    <div
      className={[
        'rounded-lg border px-3 py-2.5 transition-colors',
        isOffline ? 'border-ink-700 bg-ink-900/60 opacity-70' : 'border-ink-600 bg-ink-900',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={player.displayName} team={player.team} size="sm" online={!isOffline} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="min-w-0 break-words text-sm font-medium text-bone-100">
              {player.displayName}{player.id === meId ? ' (You)' : ''}
            </span>
            {player.isHost && <Crown size={12} className="shrink-0 text-gold-400" />}
          </div>
          <div className="mt-0.5">
            <StatusIndicator status={player.connection} />
          </div>
        </div>
        <div className="shrink-0">
          <span
            role="status"
            className={[
              'inline-flex items-center gap-1 whitespace-nowrap text-2xs uppercase tracking-wider',
              STATUS_STYLE[status],
            ].join(' ')}
          >
            {status === 'in-lobby' ? <Check size={12} /> : <Hourglass size={12} />}
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
