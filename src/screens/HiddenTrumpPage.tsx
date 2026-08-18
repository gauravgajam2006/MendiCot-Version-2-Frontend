import { useState } from 'react';
import { EyeOff, Check, Sparkles } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

interface HiddenTrumpPageProps {
  isHider: boolean;
  isReveal: boolean;
  hiderName: string;
  selectablePositions: number[];
  pending: boolean;
  message: string | null;
  onConfirm: (position: number) => void;
  onComplete: () => void;
}

export function HiddenTrumpPage({
  isHider,
  isReveal,
  hiderName,
  selectablePositions,
  pending,
  message,
  onConfirm,
  onComplete,
}: HiddenTrumpPageProps) {
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);

  if (!isHider || isReveal) {
    return (
      <div className="min-h-screen">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-16 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <Avatar name={hiderName} size="lg" />
            <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-ink-850 ring-2 ring-ink-700">
              <EyeOff size={14} className="text-gold-400" />
            </span>
          </div>
          <span className="label-eyebrow text-gold-400">Hidden trump</span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-brand text-bone-50">
            {isReveal && isHider ? 'Your trump is selected' : `${hiderName} is choosing the trump`}
          </h1>
          <p className="mt-3 max-w-md text-bone-300">
            {isReveal && isHider
              ? 'Your selected card sets the hidden trump. Continue when ready.'
              : 'The trump suit is being selected in secret. It remains private until gameplay reveals it.'}
          </p>
          {message && <p role="status" className="mt-5 text-sm text-crimson-300">{message}</p>}
          {isReveal && isHider ? (
            <Button className="mt-8" disabled={pending} onClick={onComplete}>
              {pending ? 'Continuing…' : 'Continue to table'}
            </Button>
          ) : (
            <div className="mt-8 flex items-center gap-2 text-sm text-bone-400">
              <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse-soft" /> Waiting for selection…
            </div>
          )}
        </div>
      </div>
    );
  }

  const hasValidPositions = selectablePositions.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 sm:px-6 py-8">
        <div className="mb-6 animate-fade-up">
          <span className="label-eyebrow text-gold-400">Your secret move</span>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-brand text-bone-50">
            Choose the trump card
          </h1>
          <p className="mt-2 text-bone-300 max-w-lg">
            Select one card from your hand. Its suit becomes the trump for this round — no one
            else can see your choice until it's revealed.
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center py-6">
          {!hasValidPositions ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="h-3 w-3 rounded-full bg-gold-400 animate-pulse-soft mb-3" />
              <p className="text-bone-300 font-medium">Synchronizing hidden cards…</p>
              <p className="mt-1 text-xs text-bone-400">Waiting for authoritative card positions from server.</p>
            </div>
          ) : (
            <div
              className="grid gap-3 sm:gap-4 justify-center items-center grid-cols-3 sm:grid-cols-4 md:grid-cols-6 max-w-2xl mx-auto py-4"
              role="radiogroup"
              aria-label="Select hidden trump card"
            >
              {selectablePositions.map((pos) => {
                const isSelected = selectedPosition === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Select hidden card position ${pos + 1}`}
                    disabled={pending}
                    onClick={() => setSelectedPosition(pos)}
                    className={[
                      'relative shrink-0 rounded-card border transition-all duration-200 no-tap-highlight focus-ring',
                      'w-16 h-24 sm:w-20 sm:h-28 flex flex-col items-center justify-center cursor-pointer',
                      isSelected
                        ? '-translate-y-2 border-gold-400 bg-emerald-800 shadow-card-lift ring-2 ring-gold-400'
                        : 'border-emerald-700/60 bg-gradient-to-b from-emerald-850 to-emerald-950 hover:border-gold-400/70 hover:-translate-y-1 shadow-card',
                      pending ? 'opacity-70 cursor-wait' : '',
                    ].join(' ')}
                  >
                    <div className="h-[65%] w-[75%] rounded-md border border-gold-500/30 bg-emerald-900/80 grid place-items-center">
                      <span className="text-gold-400/60 text-lg font-display select-none">✦</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t hairline pt-5">
          <p className="text-sm text-bone-300">
            {selectedPosition !== null ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <Check size={14} /> Card selected — confirm to hide the trump.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-bone-400">
                <EyeOff size={14} /> Tap a card to select it.
              </span>
            )}
          </p>
          {message && <p role="status" className="text-sm text-crimson-300">{message}</p>}
          <Button
            size="lg"
            disabled={selectedPosition === null || pending || !hasValidPositions}
            onClick={() => {
              if (selectedPosition !== null && !pending && hasValidPositions) {
                onConfirm(selectedPosition);
              }
            }}
          >
            <Sparkles size={16} /> {pending ? 'Hiding…' : 'Hide Trump'}
          </Button>
        </div>
      </div>
    </div>
  );
}
