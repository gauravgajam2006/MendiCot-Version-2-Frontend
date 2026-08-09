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
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-3 animate-fade-in sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={[
          'relative flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden surface-raised shadow-card-lift animate-scale-in sm:max-h-[calc(100dvh-2rem)]',
          sizeClasses[size],
        ].join(' ')}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-lg text-bone-400 hover:bg-ink-700 hover:text-bone-100 transition-colors focus-ring sm:right-3 sm:top-3"
        >
          <X size={16} />
        </button>
        {(title || description) && (
          <div className="shrink-0 px-4 pb-2 pt-5 pr-14 sm:px-6 sm:pt-6 sm:pr-16">
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
        {children && <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-width:thin] sm:px-6">{children}</div>}
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t hairline px-4 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
