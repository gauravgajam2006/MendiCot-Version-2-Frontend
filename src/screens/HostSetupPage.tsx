import { useState } from 'react';
import { ArrowRight, Check, Crown, Sparkles, Swords } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { PhaseIndicator } from '@/components/game/PhaseIndicator';
import { Avatar } from '@/components/ui/Avatar';
import { TeamBadge } from '@/components/ui/TeamBadge';
import type { Player, RoomState } from '@/types';

interface HostSetupPageProps {
  room: RoomState;
  meId: string;
  onDeal: (setup: { firstPlayerId: string; trumpHiderId?: string }) => void;
  onCancel: () => void;
}

export function HostSetupPage({ room, meId, onDeal, onCancel }: HostSetupPageProps) {
  const isHidden = room.config.trumpMode === 'hidden';
  const steps = isHidden
    ? [
        { key: 'first', label: 'First Player' },
        { key: 'hider', label: 'Trump Hider' },
        { key: 'deal', label: 'Deal Cards' },
      ]
    : [
        { key: 'first', label: 'First Player' },
        { key: 'deal', label: 'Deal Cards' },
      ];

  const [step, setStep] = useState(0);
  const [firstPlayerId, setFirstPlayerId] = useState<string | null>(null);
  const [trumpHiderId, setTrumpHiderId] = useState<string | null>(null);

  const onlinePlayers = room.players.filter((p) => p.connection === 'online');

  const canAdvance = () => {
    if (step === 0) return firstPlayerId !== null;
    if (step === 1 && isHidden) return trumpHiderId !== null;
    return true;
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onDeal({ firstPlayerId: firstPlayerId!, trumpHiderId: trumpHiderId ?? undefined });
  };

  const completed = Array.from({ length: step }).map((_, i) => i);

  return (
    <div className="min-h-screen">
      <TopBar onBack={onCancel} right={<span className="text-2xs uppercase tracking-[0.14em] text-gold-400 inline-flex items-center gap-1"><Crown size={12} /> Host setup</span>} />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-10">
        {/* Phase indicator */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-up">
          <div>
            <span className="label-eyebrow text-emerald-400">Game ceremony</span>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-brand text-bone-50">
              {step === 0 ? 'Who plays first?' : step === 1 && isHidden ? 'Who hides the trump?' : 'Ready to deal'}
            </h1>
            <p className="mt-1.5 text-sm text-bone-300 max-w-md">
              {step === 0
                ? 'Select the player who will take the opening lead.'
                : step === 1 && isHidden
                ? 'Select the player who will secretly choose the trump suit from their hand.'
                : 'Confirm your selections and deal the cards to begin.'}
            </p>
          </div>
          <PhaseIndicator steps={steps} current={step} completed={completed} />
        </div>

        {/* Selection grid */}
        {step < (isHidden ? 2 : 1) ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {onlinePlayers.map((p) => (
              <SelectablePlayer
                key={p.id}
                player={p}
                isMe={p.id === meId}
                selected={(step === 0 ? firstPlayerId : trumpHiderId) === p.id}
                onClick={() => (step === 0 ? setFirstPlayerId(p.id) : setTrumpHiderId(p.id))}
              />
            ))}
          </div>
        ) : (
          <div className="surface-raised p-5">
            <h3 className="font-display text-lg font-semibold text-bone-50">Confirm setup</h3>
            <div className="mt-4 space-y-3">
              <SummaryRow icon={Swords} label="First player" value={room.players.find((p) => p.id === firstPlayerId)?.displayName} />
              {isHidden && (
                <SummaryRow icon={Sparkles} label="Trump hider" value={room.players.find((p) => p.id === trumpHiderId)?.displayName} />
              )}
              <SummaryRow icon={Crown} label="Host" value={room.players.find((p) => p.id === meId)?.displayName} />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          <Button onClick={next} disabled={!canAdvance()}>
            {step === steps.length - 1 ? (
              <>
                Deal Cards <Check size={16} />
              </>
            ) : (
              <>
                Continue <ArrowRight size={16} />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SelectablePlayer({
  player,
  isMe,
  selected,
  onClick,
}: {
  player: Player;
  isMe: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'group relative flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all no-tap-highlight focus-ring',
        selected
          ? 'border-emerald-500 bg-emerald-900/30 ring-1 ring-emerald-400/40 shadow-turn'
          : 'border-ink-600 bg-ink-900 hover:border-ink-500 hover:bg-ink-850',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-ink-950">
          <Check size={12} />
        </span>
      )}
      <Avatar name={player.displayName} team={player.team} size="lg" online={player.connection === 'online'} />
      <div className="text-center">
        <p className="text-sm font-medium text-bone-100">{player.displayName}{isMe ? ' (You)' : ''}</p>
        <div className="mt-1">
          <TeamBadge team={player.team} />
        </div>
      </div>
    </button>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Crown;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-ink-900 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm text-bone-300">
        <Icon size={15} className="text-bone-400" />
        {label}
      </span>
      <span className="text-sm font-medium text-bone-50">{value ?? '—'}</span>
    </div>
  );
}
