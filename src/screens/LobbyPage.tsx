import { Crown, Settings2, Play, LogOut, Copy, Check, UserPlus } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { RoomCodeDisplay } from '@/components/ui/RoomCodeDisplay';
import { Avatar } from '@/components/ui/Avatar';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { TeamBadge } from '@/components/ui/TeamBadge';
import type { Player, RoomState, TeamId } from '@/types';

interface LobbyPageProps {
  room: RoomState;
  meId: string;
  onStart: () => void;
  onLeave: () => void;
}

export function LobbyPage({ room, meId, onStart, onLeave }: LobbyPageProps) {
  const me = room.players.find((p) => p.id === meId);
  const isHost = me?.isHost ?? false;
  const onlineCount = room.players.filter((p) => p.connection === 'online').length;
  const readyCount = room.players.filter((p) => p.isReady && p.connection === 'online').length;
  const canStart = onlineCount === room.config.playerCount && readyCount === room.config.playerCount;

  const teams: TeamId[] = ['A', 'B'];
  const seatsPerTeam = Math.ceil(room.config.playerCount / 2);

  return (
    <div className="min-h-screen">
      <TopBar
        onBack={onLeave}
        right={
          <div className="flex items-center gap-2">
            {isHost && (
              <Button variant="ghost" size="sm" disabled>
                <Settings2 size={15} /> Settings
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onLeave}>
              <LogOut size={15} /> Leave
            </Button>
          </div>
        }
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8 animate-fade-up">
          <div>
            <span className="label-eyebrow text-emerald-400">Waiting room</span>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-brand text-bone-50">
              {isHost ? 'Your table is ready' : 'Waiting for the host'}
            </h1>
            <p className="mt-2 text-bone-300">
              {onlineCount} of {room.config.playerCount} players online · {readyCount} ready
            </p>
          </div>
          <RoomCodeDisplay code={room.config.code} size="md" />
        </div>

        {/* Config summary */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-ink-600 bg-ink-900 px-3 py-1 text-bone-300">
            {room.config.playerCount} players
          </span>
          <span className="rounded-full border border-ink-600 bg-ink-900 px-3 py-1 text-bone-300">
            {room.config.trumpMode === 'normal' ? 'Normal Trump' : 'Hidden Trump'}
          </span>
          <span className="rounded-full border border-ink-600 bg-ink-900 px-3 py-1 text-bone-300">
            Best of 13 tricks
          </span>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <TeamPanel
              key={team}
              team={team}
              room={room}
              seats={seatsPerTeam}
              meId={meId}
            />
          ))}
        </div>

        {/* Host controls */}
        <div className="mt-8 surface-raised p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-display text-lg font-semibold text-bone-50">
                {canStart ? 'Ready to deal' : 'Waiting for players'}
              </p>
              <p className="mt-1 text-sm text-bone-300">
                {canStart
                  ? 'All players are online and ready. Start the setup ceremony.'
                  : `Need ${room.config.playerCount - onlineCount} more online and ${room.config.playerCount - readyCount} more ready.`}
              </p>
            </div>
            {isHost ? (
              <Button size="lg" onClick={onStart} disabled={!canStart}>
                <Play size={16} /> Start Game
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-bone-400">
                <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse-soft" />
                The host will start the game
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamPanel({
  team,
  room,
  seats,
  meId,
}: {
  team: TeamId;
  room: RoomState;
  seats: number;
  meId: string;
}) {
  const teamPlayers = room.players.filter((p) => p.team === team);
  const emptySeats = Math.max(0, seats - teamPlayers.length);
  const isA = team === 'A';

  return (
    <div className="surface-raised overflow-hidden">
      <div className={['flex items-center justify-between border-b hairline px-4 py-3', isA ? 'bg-emerald-900/20' : 'bg-gold-700/15'].join(' ')}>
        <TeamBadge team={team} name={room.teams[team]} size="md" />
        <span className="text-2xs text-bone-400 uppercase tracking-wider">
          {teamPlayers.length}/{seats} seated
        </span>
      </div>
      <div className="p-3 space-y-2">
        {teamPlayers.map((p) => (
          <PlayerRow key={p.id} player={p} isMe={p.id === meId} />
        ))}
        {Array.from({ length: emptySeats }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-3 rounded-lg border border-dashed border-ink-600 px-3 py-2.5 text-bone-500"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-ink-500">
              <UserPlus size={14} />
            </div>
            <span className="text-sm">Empty seat</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerRow({ player, isMe }: { player: Player; isMe: boolean }) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        player.connection === 'offline'
          ? 'border-ink-700 bg-ink-900/60 opacity-70'
          : 'border-ink-600 bg-ink-900',
      ].join(' ')}
    >
      <Avatar name={player.displayName} team={player.team} size="sm" online={player.connection === 'online'} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-bone-100 truncate">
            {player.displayName}{isMe ? ' (You)' : ''}
          </span>
          {player.isHost && <Crown size={12} className="text-gold-400 shrink-0" />}
        </div>
        <div className="mt-0.5">
          <StatusIndicator status={player.connection} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {player.isReady && player.connection === 'online' ? (
          <span className="inline-flex items-center gap-1 text-2xs text-emerald-300 uppercase tracking-wider">
            <Check size={12} /> Ready
          </span>
        ) : (
          <span className="text-2xs text-bone-400 uppercase tracking-wider">Waiting</span>
        )}
      </div>
    </div>
  );
}
