import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface RoomCodeDisplayProps {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'text-lg tracking-[0.3em] py-1.5 px-3',
  md: 'text-2xl tracking-[0.35em] py-2.5 px-4',
  lg: 'text-4xl tracking-[0.4em] py-4 px-6',
};

export function RoomCodeDisplay({
  code,
  size = 'md',
  label = 'Room code',
}: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="label-eyebrow">{label}</span>}
      <button
        onClick={copy}
        className={[
          'group inline-flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-900 font-display font-semibold text-bone-50 transition-all hover:border-emerald-600/60 hover:bg-ink-850 focus-ring',
          sizeClasses[size],
        ].join(' ')}
        aria-label={`Copy room code ${code}`}
      >
        <span>{code}</span>
        <span className="text-bone-400 transition-colors group-hover:text-emerald-300">
          {copied ? <Check size={size === 'lg' ? 22 : 16} /> : <Copy size={size === 'lg' ? 20 : 15} />}
        </span>
      </button>
      {copied && (
        <span className="text-2xs text-emerald-300 animate-fade-in">Copied to clipboard</span>
      )}
    </div>
  );
}
