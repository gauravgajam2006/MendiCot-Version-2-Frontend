import { useEffect } from 'react';
import type { CardInspectTarget } from '@/hooks/useCardInspect';

interface CardInspectOverlayProps {
  target: CardInspectTarget | null;
  onClose: () => void;
}

export function CardInspectOverlay({ target, onClose }: CardInspectOverlayProps) {
  useEffect(() => {
    if (!target) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={target.label ?? 'Card Preview'}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-ink-950/85 backdrop-blur-sm pointer-events-none select-none animate-fade-in"
    >
      <div className="flex flex-col items-center justify-center max-w-full max-h-full">
        <img
          src={target.imageUrl}
          alt={target.label ?? 'Card Artwork'}
          draggable={false}
          className="rounded-2xl shadow-2xl ring-1 ring-white/10"
          style={{
            maxWidth: 'min(90vw, 450px)',
            maxHeight: '82vh',
            width: 'auto',
            height: 'auto',
            aspectRatio: '9 / 10',
            objectFit: 'contain',
          }}
        />
        {target.label && (
          <span className="mt-3.5 text-xs sm:text-sm font-semibold tracking-wider text-bone-200 uppercase bg-ink-900/90 px-3.5 py-1.5 rounded-full ring-1 ring-white/10 shadow-lg">
            {target.label}
          </span>
        )}
      </div>
    </div>
  );
}
