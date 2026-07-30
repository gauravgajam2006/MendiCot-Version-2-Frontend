import { RotateCcw, LogOut, Trophy, TrendingUp, Target } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { TeamBadge } from '@/components/ui/TeamBadge';
import type { Player, TeamId } from '@/types';

interface GameEndPageProps {
  winningTeam: TeamId;
  scores: Record<TeamId, { name: string; tricks: number; tens: number }>;
  players: Player[];
  meId: string;
  onRematch: () => void;
  onLeave: () => void;
}

export function GameEndPage({
  winningTeam,
  scores,
  players,
  meId,
  onRematch,
  onLeave,
}: GameEndPageProps) {
  const isA = winningTeam === 'A';
  const winner = scores[winningTeam];
  const loser = scores[isA ? 'B' : 'A'];
  const myTeam = players.find((p) => p.id === meId)?.team;
  const iWon = myTeam === winningTeam;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6 py-8 sm:py-12">
        {/* Result header */}
        <div className="flex flex-col items-center text-center animate-fade-up">
          <div
            className={[
              'mb-5 grid h-16 w-16 place-items-center rounded-full border-2',
              isA ? 'border-emerald-400/60 bg-emerald-900/30' : 'border-gold-400/60 bg-gold-700/20',
            ].join(' ')}
          >
            <Trophy size={28} className={isA ? 'text-emerald-300' : 'text-gold-300'} />
          </div>
          <span className="label-eyebrow text-bone-400">Game complete</span>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl font-semibold tracking-tightest text-bone-50">
            {iWon ? 'Victory' : 'Defeat'}
          </h1>
          <p className="mt-3 text-bone-300">
            <span className={isA ? 'text-emerald-300' : 'text-gold-300'}>{winner.name}</span> won the round
          </p>
        </div>

        {/* Score summary */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border hairline bg-ink-700">
          <TeamResult team="A" name={scores.A.name} tricks={scores.A.tricks} tens={scores.A.tens} won={winningTeam === 'A'} />
          <TeamResult team="B" name={scores.B.name} tricks={scores.B.tricks} tens={scores.B.tens} won={winningTeam === 'B'} />
        </div>

        {/* Player stats */}
        <div className="mt-6 surface-raised p-4">
          <h3 className="font-display text-base font-semibold text-bone-50 mb-3">Player summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {players.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-2 rounded-lg bg-ink-900 p-3 text-center">
                <Avatar name={p.displayName} team={p.team} size="sm" />
                <div>
                  <p className="text-xs font-medium text-bone-100">{p.displayName}{p.id === meId ? ' (You)' : ''}</p>
                  <div className="mt-1">
                    <TeamBadge team={p.team} />
                  </div>
                </div>
                <span className={['text-2xs uppercase tracking-wider', p.team === winningTeam ? 'text-emerald-300' : 'text-bone-400'].join(' ')}>
                  {p.team === winningTeam ? 'Winner' : 'Runner-up'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Button size="lg" fullWidth onClick={onRematch} className="sm:flex-1">
            <RotateCcw size={16} /> Rematch
          </Button>
          <Button size="lg" variant="secondary" fullWidth onClick={onLeave} className="sm:flex-1">
            <LogOut size={16} /> Return to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamResult({
  team,
  name,
  tricks,
  tens,
  won,
}: {
  team: TeamId;
  name: string;
  tricks: number;
  tens: number;
  won: boolean;
}) {
  const isA = team === 'A';
  return (
    <div className={['p-5 sm:p-6 text-center', isA ? 'bg-emerald-900/20' : 'bg-gold-700/15'].join(' ')}>
      <div className="flex items-center justify-center gap-2">
        {won && <Trophy size={16} className={isA ? 'text-emerald-300' : 'text-gold-300'} />}
        <TeamBadge team={team} name={name} size="md" leading={won} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
        <div className="flex flex-col items-center">
          <TrendingUp size={15} className={isA ? 'text-emerald-400' : 'text-gold-400'} />
          <span className="mt-1 font-display text-3xl font-semibold tabular-nums text-bone-50">{tricks}</span>
          <span className="text-2xs uppercase tracking-wider text-bone-400">Tricks</span>
        </div>
        <div className="h-10 w-px bg-ink-600" />
        <div className="flex flex-col items-center">
          <Target size={15} className={isA ? 'text-emerald-400' : 'text-gold-400'} />
          <span className="mt-1 font-display text-3xl font-semibold tabular-nums text-bone-50">{tens}</span>
          <span className="text-2xs uppercase tracking-wider text-bone-400">Tens</span>
        </div>
      </div>
    </div>
  );
}
