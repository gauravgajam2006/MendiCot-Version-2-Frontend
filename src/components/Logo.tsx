interface LogoProps {
  size?: number;
  className?: string;
  showMark?: boolean;
}

// A minimal symbolic mark: two opposing card silhouettes (the two teams)
// leaning toward each other, with a subtle suit notch and a central seam
// representing the trick. Designed to read as "strategy / two teams / cards"
// without copying a generic playing-card icon.
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* Left card (Team A — emerald) */}
      <rect
        x="4"
        y="6"
        width="11"
        height="20"
        rx="2.5"
        transform="rotate(-9 9.5 16)"
        fill="#1f4230"
        stroke="#4a8765"
        strokeWidth="1.25"
      />
      {/* Right card (Team B — gold) */}
      <rect
        x="17"
        y="6"
        width="11"
        height="20"
        rx="2.5"
        transform="rotate(9 22.5 16)"
        fill="#1c241e"
        stroke="#c19a42"
        strokeWidth="1.25"
      />
      {/* Central seam / trick line */}
      <line x1="16" y1="9" x2="16" y2="23" stroke="#d4af5a" strokeWidth="1.1" strokeLinecap="round" />
      {/* Suit notch — a subtle spade-ish dot cluster at the center */}
      <circle cx="16" cy="16" r="1.6" fill="#d4af5a" />
    </svg>
  );
}

export function Logo({ size = 32, className = '', showMark = true }: LogoProps) {
  return (
    <div className={['inline-flex items-center gap-2.5', className].join(' ')}>
      {showMark && <LogoMark size={size} />}
      <span
        className="font-display font-semibold tracking-brand leading-none text-bone-50"
        style={{ fontSize: size * 0.72 }}
      >
        Mendi<span className="text-emerald-400">Cot</span>
      </span>
    </div>
  );
}

export function Wordmark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className="font-display font-semibold tracking-brand leading-none text-bone-50"
      style={{ fontSize: size }}
    >
      Mendi<span className="text-emerald-400">Cot</span>
    </span>
  );
}
