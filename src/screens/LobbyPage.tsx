import { useState } from 'react';
import { Crown, Settings2, Play, LogOut, Check, UserPlus } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { RoomCodeDisplay } from '@/components/ui/RoomCodeDisplay';
import { Avatar } from '@/components/ui/Avatar';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { InlineTeamName } from '@/components/ui/InlineTeamName';
import { Modal } from '@/components/ui/Modal';
import { TurnAlertSettings } from '@/components/TurnAlertControls';
import type { BackendTeamId } from '@/api';
import { getLobbyStartState, getTeamSwitchControl } from '@/utils/lobbyState';
import type { Player, RoomState, TeamId } from '@/types';

interface LobbyPageProps {
  room: RoomState;
  meId: string;
  pendingTeamSwitch: BackendTeamId | null;
  startPending: boolean;
  actionMessage: string | null;
  pendingTeamRename: boolean;
  teamRenameMessage: string | null;
  onSwitchTeam: (targetTeam: TeamId) => void;
  onRenameTeam: (name: string) => void;
  onClearTeamRenameMessage: () => void;
  onStart: () => void;
  onLeave: () => void;
  onNotificationPermissionChanged: () => void;
}

export function LobbyPage({
  room,
  meId,
  pendingTeamSwitch,
  startPending,
  actionMessage,
  pendingTeamRename,
  teamRenameMessage,
  onSwitchTeam,
  onRenameTeam,
  onClearTeamRenameMessage,
  onStart,
  onLeave,
  onNotificationPermissionChanged,
}: LobbyPageProps) {
  const [showSettings, setShowSettings] = useState(false);
  const me = room.players.find((p) => p.id === meId);
  const isHost = me?.isHost ?? false;
  const onlineCount = room.players.filter((p) => p.connection === 'online').length;
  const readyCount = room.players.filter((p) => p.isReady && p.connection === 'online').length;
  const startState = getLobbyStartState(room, meId);
  const startDisabled = !startState.canStart || pendingTeamSwitch !== null || startPending;
  const switchControl = me && room.status === 'WAITING'
    ? getTeamSwitchControl(me, meId, room.teams)
    : null;

  const teams: TeamId[] = ['A', 'B'];
  const seatsPerTeam = startState.requiredTeamSize;

  return (
    <div className="min-h-screen">
      <TopBar
        onBack={onLeave}
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <Settings2 size={15} /> Settings
            </Button>
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
          <div className="flex w-full max-w-xs self-center flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:self-auto">
            <RoomCodeDisplay code={room.config.code} size="md" />
            {switchControl && (
              <Button
                variant="secondary"
                size="sm"
                className="h-11 w-full sm:h-9 sm:w-auto"
                aria-label={switchControl.label}
                disabled={pendingTeamSwitch !== null || startPending}
                loading={pendingTeamSwitch !== null}
                onClick={() => onSwitchTeam(switchControl.targetTeam)}
              >
                {pendingTeamSwitch !== null ? 'Switching…' : 'Switch Team'}
              </Button>
            )}
            {actionMessage && (
              <p
                role="status"
                className="w-full rounded-lg border border-crimson-500/40 bg-crimson-500/10 px-3 py-2 text-center text-sm text-crimson-400"
              >
                {actionMessage}
              </p>
            )}
          </div>
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
              editable={team === me?.team}
              renamePending={pendingTeamRename}
              renameMessage={team === me?.team ? teamRenameMessage : null}
              onRename={onRenameTeam}
              onClearRenameMessage={onClearTeamRenameMessage}
            />
          ))}
        </div>

        {/* Host controls */}
        <div className="mt-8 surface-raised p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-display text-lg font-semibold text-bone-50">
                {startState.canStart && pendingTeamSwitch === null ? 'Ready to deal' : 'Not ready to start'}
              </p>
              <p className="mt-1 text-sm text-bone-300">
                {pendingTeamSwitch !== null ? 'Waiting for the team switch to finish.' : startState.reason}
              </p>
            </div>
            {isHost ? (
              <Button size="lg" onClick={onStart} disabled={startDisabled} loading={startPending}>
                <Play size={16} /> {startPending ? 'Starting…' : 'Start Game'}
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
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings" description="These preferences stay on this browser and are never shared with the room.">
        <TurnAlertSettings onNotificationPermissionChanged={onNotificationPermissionChanged} />
      </Modal>
    </div>
  );
}

function TeamPanel({
  team,
  room,
  seats,
  editable,
  renamePending,
  renameMessage,
  onRename,
  onClearRenameMessage,
}: {
  team: TeamId;
  room: RoomState;
  seats: number;
  editable: boolean;
  renamePending: boolean;
  renameMessage: string | null;
  onRename: (name: string) => void;
  onClearRenameMessage: () => void;
}) {
  const teamPlayers = room.players.filter((p) => p.team === team);
  const emptySeats = Math.max(0, seats - teamPlayers.length);
  const isA = team === 'A';

  return (
    <div className="surface-raised overflow-hidden">
      <div className={['flex items-center justify-between border-b hairline px-4 py-3', isA ? 'bg-emerald-900/20' : 'bg-gold-700/15'].join(' ')}>
        <InlineTeamName
          team={team}
          name={room.teams[team]}
          editable={editable}
          pending={renamePending && editable}
          error={renameMessage}
          onCommit={onRename}
          onClearError={onClearRenameMessage}
        />
        <span className="text-2xs text-bone-400 uppercase tracking-wider">
          {teamPlayers.length} / {seats} seated
        </span>
      </div>
      <div className="p-3 space-y-2">
        {teamPlayers.map((p) => (
          <PlayerRow key={p.id} player={p} />
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

function PlayerRow({ player }: { player: Player }) {
  return (
    <div
      className={[
        'rounded-lg border px-3 py-2.5 transition-colors',
        player.connection === 'offline'
          ? 'border-ink-700 bg-ink-900/60 opacity-70'
          : 'border-ink-600 bg-ink-900',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={player.displayName} team={player.team} size="sm" online={player.connection === 'online'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-sm font-medium text-bone-100 break-words">
              {player.displayName}{player.isCurrentPlayer ? ' (You)' : ''}
            </span>
            {player.isHost && <Crown size={12} className="shrink-0 text-gold-400" />}
          </div>
          <div className="mt-0.5">
            <StatusIndicator status={player.connection} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {player.isReady && player.connection === 'online' ? (
            <span className="inline-flex items-center gap-1 text-2xs text-emerald-300 uppercase tracking-wider">
              <Check size={12} /> Ready
            </span>
          ) : (
            <span className="text-2xs text-bone-400 uppercase tracking-wider">Waiting</span>
          )}
        </div>
      </div>
    </div>
  );
}
