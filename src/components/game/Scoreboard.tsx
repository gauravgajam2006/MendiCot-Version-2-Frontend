import type { Suit, TeamId } from '@/types';
import { Crown } from 'lucide-react';
import { CapturedMendisSlots } from './CapturedMendisSlots';

interface ScoreboardProps {
  scores: Record<TeamId, { name: string; tricks: number; tens: number; capturedMendis?: Suit[] }>;
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
          capturedMendis={a.capturedMendis}
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
          capturedMendis={b.capturedMendis}
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
  capturedMendis,
  tricksToWin,
  tensToWin,
  leading,
  team,
  compact,
}: {
  name: string;
  tricks: number;
  tens: number;
  capturedMendis?: Suit[];
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
    <section className={['flex-1 min-w-0 py-2.5', compact ? 'px-2 sm:px-2.5' : 'px-3'].join(' ')} aria-label={`${name} score`}>
      <div className="flex min-w-0 items-center justify-center gap-1.5">
        {leading && <Crown size={compact ? 11 : 13} className={accent} />}
        <span className={['min-w-0 whitespace-nowrap text-center text-2xs font-medium uppercase leading-tight tracking-[0.08em]', accent].join(' ')}>
          {name}
        </span>
      </div>
      <div
        className={[
          'mt-2 grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-stretch text-center',
          compact ? 'gap-2' : 'gap-3',
        ].join(' ')}
      >
        <MetricColumn
          label="Tricks"
          compact={compact}
          value={<span className={['font-display font-semibold leading-none tabular-nums', compact ? 'text-xl sm:text-2xl' : 'text-2xl', isA ? 'text-emerald-200' : 'text-gold-200'].join(' ')}>{tricks}</span>}
        />
        <MetricColumn
          label="Mendis"
          compact={compact}
          value={<CapturedMendisSlots capturedSuits={capturedMendis} teamName={name} compact={compact} />}
        />
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
    </section>
  );
}

function MetricColumn({
  label,
  value,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-rows-[1.75rem_auto] items-end">
      <div className={['flex min-w-0 items-center justify-center', compact ? 'h-6 sm:h-7' : 'h-7'].join(' ')}>{value}</div>
      <span className="mt-1 block text-2xs font-medium uppercase leading-none tracking-[0.1em] text-bone-400">{label}</span>
    </div>
  );
}
