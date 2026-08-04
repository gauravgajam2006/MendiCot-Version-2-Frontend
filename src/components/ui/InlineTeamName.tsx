import { useEffect, useRef, useState } from 'react';
import type { TeamId } from '@/types';
import { isDoubleTap, normalizeTeamName } from '@/utils/teamNames';

interface InlineTeamNameProps {
  team: TeamId;
  name: string;
  editable: boolean;
  pending: boolean;
  error: string | null;
  onCommit: (name: string) => void;
  onClearError: () => void;
}

export function InlineTeamName({
  team,
  name,
  editable,
  pending,
  error,
  onCommit,
  onClearError,
}: InlineTeamNameProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTapAtRef = useRef<number | null>(null);

  const isA = team === 'A';
  const base = isA
    ? 'bg-emerald-900/40 text-emerald-200 border-emerald-700/50'
    : 'bg-gold-700/20 text-gold-300 border-gold-600/40';
  const dot = isA ? 'bg-emerald-400' : 'bg-gold-400';

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [editing, name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (pending) setEditing(false);
  }, [pending]);

  useEffect(() => {
    if (error && editable && !pending && !editing) {
      setDraft(name);
      setEditing(true);
    }
  }, [editable, editing, error, name, pending]);

  const beginEditing = () => {
    if (!editable || pending) return;
    setInlineError(null);
    onClearError();
    setDraft(name);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(name);
    setInlineError(null);
    onClearError();
    setEditing(false);
  };

  const commit = () => {
    if (!editing || pending) return;
    const normalized = normalizeTeamName(draft);
    if (!normalized) {
      setInlineError('A team name is required.');
      return;
    }
    if (normalized === name) {
      cancelEditing();
      return;
    }
    setInlineError(null);
    onClearError();
    onCommit(normalized);
  };

  return (
    <div className="min-w-0">
      <div
        className={[
          'inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium uppercase tracking-[0.12em] px-2.5 py-1 text-xs',
          base,
          editable && !pending ? 'cursor-text' : '',
          pending ? 'opacity-60' : '',
        ].join(' ')}
        title={editable ? 'Double-click to rename your team' : undefined}
        onDoubleClick={beginEditing}
        onTouchEnd={(event) => {
          if (!editable || pending) return;
          const now = event.timeStamp;
          if (isDoubleTap(lastTapAtRef.current, now)) {
            event.preventDefault();
            lastTapAtRef.current = null;
            beginEditing();
          } else {
            lastTapAtRef.current = now;
          }
        }}
      >
        <span className={['h-1.5 w-1.5 shrink-0 rounded-full', dot].join(' ')} />
        {editing ? (
          <input
            ref={inputRef}
            aria-label="Rename your team"
            className="min-w-0 w-36 max-w-[40vw] bg-transparent text-inherit outline-none normal-case tracking-normal placeholder:text-bone-500 sm:w-44"
            value={draft}
            disabled={pending}
            onChange={(event) => {
              setDraft(event.target.value);
              setInlineError(null);
            }}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                cancelEditing();
              }
            }}
          />
        ) : (
          <span className="min-w-0 truncate">{name}</span>
        )}
        {pending && <span className="h-2 w-2 shrink-0 animate-spin rounded-full border border-current border-t-transparent" aria-label="Renaming" />}
      </div>
      {(inlineError || error) && (
        <p role="status" className="mt-1 max-w-xs text-2xs normal-case tracking-normal text-crimson-300">
          {inlineError ?? error}
        </p>
      )}
    </div>
  );
}
