import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-emerald-500 text-ink-950 hover:bg-emerald-400 active:bg-emerald-600 border border-emerald-400/50 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]',
  secondary:
    'bg-ink-700 text-bone-50 hover:bg-ink-600 active:bg-ink-800 border border-ink-600',
  ghost:
    'bg-transparent text-bone-200 hover:bg-ink-800 hover:text-bone-50 border border-transparent',
  gold:
    'bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600 border border-gold-400/50 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]',
  danger:
    'bg-crimson-500/15 text-crimson-400 hover:bg-crimson-500/25 border border-crimson-500/40',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-lg gap-2',
  lg: 'h-13 px-7 text-base rounded-xl gap-2.5 py-3.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium no-tap-highlight transition-all duration-150 focus-ring select-none',
          'disabled:opacity-45 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading && (
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
