import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          'relative w-full surface-raised shadow-card-lift animate-scale-in',
          sizeClasses[size],
        ].join(' ')}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-bone-400 hover:bg-ink-700 hover:text-bone-100 transition-colors focus-ring"
        >
          <X size={16} />
        </button>
        {(title || description) && (
          <div className="px-6 pt-6 pb-2">
            {title && (
              <h2 className="font-display text-xl font-semibold tracking-brand text-bone-50">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1.5 text-sm text-bone-300 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}
        {children && <div className="px-6 py-4">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t hairline px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
