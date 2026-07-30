interface PhaseIndicatorProps {
  steps: { key: string; label: string; description?: string }[];
  current: number; // 0-based index of the active step
  completed?: number[]; // indexes completed
}

export function PhaseIndicator({ steps, current, completed = [] }: PhaseIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isActive = i === current;
        const isDone = completed.includes(i);
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'grid h-7 w-7 place-items-center rounded-full border text-2xs font-semibold transition-all',
                  isActive
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 shadow-turn'
                    : isDone
                    ? 'border-emerald-600/50 bg-emerald-900/40 text-emerald-300'
                    : 'border-ink-600 bg-ink-900 text-bone-400',
                ].join(' ')}
              >
                {isDone ? '✓' : i + 1}
              </div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className={['text-2xs uppercase tracking-[0.14em]', isActive ? 'text-emerald-300' : 'text-bone-400'].join(' ')}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={['h-px w-6 sm:w-10', isDone ? 'bg-emerald-600/50' : 'bg-ink-600'].join(' ')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
