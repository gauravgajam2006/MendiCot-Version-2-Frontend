import type { TeamId } from '@/types';
import { Crown, Target } from 'lucide-react';

interface ScoreboardProps {
  scores: Record<TeamId, { name: string; tricks: number; tens: number }>;
  tricksToWin?: number;
  tensToWin?: number;
  compact?: boolean;
}

export function Scoreboard({ scores, tricksToWin, tensToWin = 3, compact }: ScoreboardProps) {
  const a = scores.A;
  const b = scores.B;
  const leading = a.tricks > b.tricks ? 'A' : b.tricks > a.tricks ? 'B' : null;

  return (
    <div className={['surface rounded-xl', compact ? 'p-2' : 'p-3'].join(' ')}>
      <div className="flex items-stretch gap-px overflow-hidden rounded-lg bg-ink-900">
        <TeamColumn
          name={a.name}
          tricks={a.tricks}
          tens={a.tens}
          tricksToWin={tricksToWin}
          tensToWin={tensToWin}
          leading={leading === 'A'}
          team="A"
          compact={compact}
        />
        <div className="w-px bg-ink-700" />
        <TeamColumn
          name={b.name}
          tricks={b.tricks}
          tens={b.tens}
          tricksToWin={tricksToWin}
          tensToWin={tensToWin}
          leading={leading === 'B'}
          team="B"
          compact={compact}
        />
      </div>
    </div>
  );
}

function TeamColumn({
  name,
  tricks,
  tens,
  tricksToWin,
  tensToWin,
  leading,
  team,
  compact,
}: {
  name: string;
  tricks: number;
  tens: number;
  tricksToWin?: number;
  tensToWin: number;
  leading: boolean;
  team: TeamId;
  compact?: boolean;
}) {
  const isA = team === 'A';
  const accent = isA ? 'text-emerald-300' : 'text-gold-300';
  const bar = isA ? 'bg-emerald-500' : 'bg-gold-500';
  const progress = tricksToWin ? Math.min(100, (tricks / tricksToWin) * 100) : 0;
  const tensProgress = Math.min(100, (tens / tensToWin) * 100);

  return (
    <div className="flex-1 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        {leading && <Crown size={compact ? 11 : 13} className={accent} />}
        <span className={['text-2xs font-medium uppercase tracking-[0.14em] truncate', accent].join(' ')}>
          {name}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-3">
        <div>
          <span className={['font-display text-2xl font-semibold tabular-nums', isA ? 'text-emerald-200' : 'text-gold-200'].join(' ')}>
            {tricks}
          </span>
          <span className="ml-1 text-2xs text-bone-400 uppercase tracking-wider">tricks</span>
        </div>
        <div className="flex items-center gap-1">
          <Target size={11} className={isA ? 'text-emerald-400' : 'text-gold-400'} />
          <span className="font-display text-lg font-semibold tabular-nums text-bone-100">
            {tens}
          </span>
          <span className="text-2xs text-bone-400 uppercase tracking-wider">tens</span>
        </div>
      </div>
      {tricksToWin && !compact && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink-700">
          <div className={['h-full rounded-full transition-all duration-500', bar].join(' ')} style={{ width: `${progress}%` }} />
        </div>
      )}
      {!compact && (
        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-ink-700">
          <div className={['h-full rounded-full transition-all duration-500', bar, 'opacity-50'].join(' ')} style={{ width: `${tensProgress}%` }} />
        </div>
      )}
    </div>
  );
}
