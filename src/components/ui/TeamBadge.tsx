import type { TeamId } from '@/types';

interface TeamBadgeProps {
  team: TeamId;
  name?: string;
  size?: 'sm' | 'md';
  leading?: boolean;
}

export function TeamBadge({ team, name, size = 'sm', leading }: TeamBadgeProps) {
  const isA = team === 'A';
  const base = isA
    ? 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50'
    : 'bg-gold-700/20 text-gold-300 border-gold-600/40';
  const dot = isA ? 'bg-emerald-400' : 'bg-gold-400';

  const padding = size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-[0.12em]',
        base,
        padding,
        leading ? 'ring-1 ring-emerald-400/30' : '',
      ].join(' ')}
    >
      <span className={['h-1.5 w-1.5 rounded-full', dot].join(' ')} />
      {name ?? (isA ? 'Team Maroon' : 'Team Gold')}
    </span>
  );
}
