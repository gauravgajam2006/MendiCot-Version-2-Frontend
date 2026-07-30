import type { TeamId } from '@/types';
import { initials } from '@/mockData';

interface AvatarProps {
  name: string;
  team?: TeamId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'h-7 w-7 text-2xs',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
};

const dotSize = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
};

export function Avatar({
  name,
  team,
  size = 'md',
  online,
  className = '',
}: AvatarProps) {
  const teamRing =
    team === 'A'
      ? 'ring-emerald-500/40 bg-emerald-900/40 text-emerald-100'
      : team === 'B'
      ? 'ring-gold-500/40 bg-gold-700/25 text-gold-300'
      : 'ring-ink-600 bg-ink-800 text-bone-200';

  const statusColor =
    online === undefined
      ? ''
      : online
      ? 'bg-emerald-400'
      : 'bg-bone-500';

  return (
    <div className={['relative inline-flex shrink-0', className].join(' ')}>
      <div
        className={[
          'grid place-items-center rounded-full font-semibold ring-1 ring-inset tracking-wide select-none',
          sizeClasses[size],
          teamRing,
        ].join(' ')}
        aria-hidden
      >
        {initials(name)}
      </div>
      {online !== undefined && (
        <span
          className={[
            'absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-ink-850',
            dotSize[size],
            statusColor,
          ].join(' ')}
        />
      )}
    </div>
  );
}
