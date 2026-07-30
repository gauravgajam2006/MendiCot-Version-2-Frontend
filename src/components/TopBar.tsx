import { Logo } from '@/components/Logo';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface TopBarProps {
  onBack?: () => void;
  right?: ReactNode;
  showLogo?: boolean;
}

export function TopBar({ onBack, right, showLogo = true }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b hairline bg-ink-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="grid h-9 w-9 place-items-center rounded-lg text-bone-300 hover:bg-ink-800 hover:text-bone-50 transition-colors focus-ring"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {showLogo && <Logo size={26} />}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
