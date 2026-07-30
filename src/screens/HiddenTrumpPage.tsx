import { useState } from 'react';
import { EyeOff, Check, Sparkles } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { CardHand } from '@/components/game/CardHand';
import { Avatar } from '@/components/ui/Avatar';
import type { Card } from '@/types';

interface HiddenTrumpPageProps {
  isHider: boolean;
  hiderName: string;
  hand: Card[];
  onConfirm: (cardId: string) => void;
}

export function HiddenTrumpPage({ isHider, hiderName, hand, onConfirm }: HiddenTrumpPageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isHider) {
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
            {hiderName} is choosing the trump
          </h1>
          <p className="mt-3 max-w-md text-bone-300">
            The trump suit is being selected in secret. Once it's revealed, it will appear on
            the table for everyone.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-bone-400">
            <span className="h-2 w-2 rounded-full bg-gold-400 animate-pulse-soft" />
            Waiting for selection…
          </div>
        </div>
      </div>
    );
  }

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

        <div className="flex-1 flex items-center justify-center py-8">
          <CardHand
            cards={hand}
            selectedId={selectedId}
            onCardClick={(c) => setSelectedId(c.id)}
            size="lg"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t hairline pt-5">
          <p className="text-sm text-bone-300">
            {selectedId ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                <Check size={14} /> Card selected — confirm to hide the trump.
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-bone-400">
                <EyeOff size={14} /> Tap a card to select it.
              </span>
            )}
          </p>
          <Button size="lg" disabled={!selectedId} onClick={() => selectedId && onConfirm(selectedId)}>
            <Sparkles size={16} /> Hide Trump
          </Button>
        </div>
      </div>
    </div>
  );
}
