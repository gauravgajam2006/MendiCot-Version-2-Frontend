import { useState } from 'react';
import { Check, Lock, EyeOff, Eye } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import type { PlayerCount, TrumpMode } from '@/types';

interface CreateRoomPageProps {
  onBack: () => void;
  onCreate: (config: { name: string; playerCount: PlayerCount; trumpMode: TrumpMode }) => void;
}

const playerCounts: { value: PlayerCount; label: string; sub: string }[] = [
  { value: 4, label: '4', sub: 'Classic' },
  { value: 6, label: '6', sub: 'Six-hand' },
  { value: 8, label: '8', sub: 'Full table' },
];

const trumpModes: { value: TrumpMode; label: string; description: string; icon: typeof Eye }[] = [
  {
    value: 'normal',
    label: 'Normal Trump',
    description: 'The starting player chooses the trump suit openly before the hand begins.',
    icon: Eye,
  },
  {
    value: 'hidden',
    label: 'Hidden Trump',
    description: 'A chosen player hides one card from their hand. Its suit becomes the secret trump.',
    icon: EyeOff,
  },
];

export function CreateRoomPage({ onBack, onCreate }: CreateRoomPageProps) {
  const [name, setName] = useState('');
  const [playerCount, setPlayerCount] = useState<PlayerCount>(4);
  const [trumpMode, setTrumpMode] = useState<TrumpMode>('normal');
  const [touched, setTouched] = useState(false);

  const nameError = touched && name.trim().length < 2 ? 'Enter a display name (2+ characters)' : undefined;

  const submit = () => {
    setTouched(true);
    if (name.trim().length < 2) return;
    onCreate({ name: name.trim(), playerCount, trumpMode });
  };

  return (
    <div className="min-h-screen">
      <TopBar onBack={onBack} />

      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 animate-fade-up">
          <span className="label-eyebrow text-emerald-400">Step 1 of 1</span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-brand text-bone-50">
            Create a room
          </h1>
          <p className="mt-2 text-bone-300">Set up your table. You can adjust these before dealing.</p>
        </div>

        <div className="space-y-7">
          {/* Display name */}
          <Field label="Your display name" error={nameError}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Gaurav"
              invalid={!!nameError}
              maxLength={20}
              autoFocus
            />
          </Field>

          {/* Player count */}
          <div>
            <span className="label-eyebrow text-bone-300">Players at the table</span>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {playerCounts.map((opt) => {
                const selected = playerCount === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPlayerCount(opt.value)}
                    className={[
                      'group relative flex flex-col items-center gap-1 rounded-xl border px-3 py-4 transition-all no-tap-highlight focus-ring',
                      selected
                        ? 'border-emerald-500 bg-emerald-900/30 ring-1 ring-emerald-400/40'
                        : 'border-ink-600 bg-ink-900 hover:border-ink-500 hover:bg-ink-850',
                    ].join(' ')}
                  >
                    {selected && (
                      <span className="absolute right-2 top-2 text-emerald-400">
                        <Check size={14} />
                      </span>
                    )}
                    <span className={['font-display text-2xl font-semibold', selected ? 'text-emerald-300' : 'text-bone-100'].join(' ')}>
                      {opt.label}
                    </span>
                    <span className="text-2xs uppercase tracking-[0.14em] text-bone-400">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trump mode */}
          <div>
            <span className="label-eyebrow text-bone-300">Trump selection</span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trumpModes.map((opt) => {
                const selected = trumpMode === opt.value;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTrumpMode(opt.value)}
                    className={[
                      'group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all no-tap-highlight focus-ring',
                      selected
                        ? 'border-emerald-500 bg-emerald-900/25 ring-1 ring-emerald-400/40'
                        : 'border-ink-600 bg-ink-900 hover:border-ink-500 hover:bg-ink-850',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className={['inline-flex items-center gap-2 font-display text-base font-semibold', selected ? 'text-emerald-200' : 'text-bone-100'].join(' ')}>
                        <Icon size={16} className={selected ? 'text-emerald-400' : 'text-bone-400'} />
                        {opt.label}
                      </span>
                      {selected && <Check size={16} className="text-emerald-400" />}
                    </div>
                    <p className="text-xs text-bone-300 leading-relaxed">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button size="lg" fullWidth onClick={submit} className="sm:flex-1">
              <Lock size={16} />
              Create Room
            </Button>
            <Button size="lg" variant="ghost" onClick={onBack} className="sm:w-auto">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
