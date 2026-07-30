import type { InputHTMLAttributes, ReactNode } from 'react';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="label-eyebrow text-bone-300">{label}</label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-crimson-400 animate-fade-in">{error}</p>
      ) : hint ? (
        <p className="text-xs text-bone-400">{hint}</p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  invalid?: boolean;
  prefix?: ReactNode;
}

export function TextInput({ invalid, prefix, className = '', ...props }: TextInputProps) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bone-400 text-sm pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        className={[
          'w-full h-12 rounded-lg border bg-ink-900 px-3.5 text-bone-50 placeholder:text-bone-500 transition-colors focus-ring',
          prefix ? 'pl-10' : '',
          invalid
            ? 'border-crimson-500/60 focus:border-crimson-400'
            : 'border-ink-600 hover:border-ink-500 focus:border-emerald-500',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
}
