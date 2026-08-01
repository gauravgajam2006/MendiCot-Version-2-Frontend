import { AlertTriangle, LogIn, Trash2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import type { RoomSession } from '@/utils/roomSession';

export interface ResumeSessionChoice { sessionKey: string; session: RoomSession }
export type SessionRestoreNoticeKind = 'session-expired' | 'room-closed' | 'session-invalid';

interface ResumeSessionPageProps {
  sessions: ResumeSessionChoice[];
  blockedSessionKey: string | null;
  notice: SessionRestoreNoticeKind | null;
  onResume: (choice: ResumeSessionChoice, takeOver?: boolean) => void;
  onForget: (sessionKey: string) => void;
  onCancel: () => void;
}

const noticeContent: Record<SessionRestoreNoticeKind, { title: string; description: string }> = {
  'session-expired': { title: 'Session Expired', description: 'This player is no longer in the room. Please join again.' },
  'room-closed': { title: 'Room Closed', description: 'This room no longer exists.' },
  'session-invalid': { title: 'Session Invalid', description: 'Please join the room again.' },
};

export function SessionRestoreNotice({ kind, floating = false }: { kind: SessionRestoreNoticeKind; floating?: boolean }) {
  const content = noticeContent[kind];
  return (
    <div
      role="status"
      className={[
        'rounded-xl border border-gold-500/40 bg-ink-900 p-4 text-sm shadow-lg',
        floating ? 'fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2' : 'mt-5',
      ].join(' ')}
    >
      <p className="flex items-center gap-2 font-medium text-gold-300"><AlertTriangle size={16} /> {content.title}</p>
      <p className="mt-1 text-bone-300">{content.description}</p>
    </div>
  );
}

export function ResumeSessionPage({ sessions, blockedSessionKey, notice, onResume, onForget, onCancel }: ResumeSessionPageProps) {
  const blockedChoice = sessions.find(({ sessionKey }) => sessionKey === blockedSessionKey);
  return (
    <div className="relative min-h-screen px-4 py-10">
      <div className="pointer-events-none absolute inset-0 table-felt opacity-40" />
      <main className="relative z-10 mx-auto max-w-xl">
        <div className="mb-8 text-center"><Logo size={34} /></div>
        <section className="surface-raised p-5 sm:p-7">
          <span className="label-eyebrow text-emerald-400">Saved players</span>
          <h1 className="mt-2 font-display text-3xl font-semibold text-bone-50">Resume a session</h1>
          <p className="mt-2 text-sm leading-relaxed text-bone-300">
            Choose the saved player identity that belongs in this tab.
          </p>
          {notice && <SessionRestoreNotice kind={notice} />}
          {blockedChoice && (
            <div className="mt-5 rounded-xl border border-gold-500/40 bg-gold-700/10 p-4 text-sm text-bone-200">
              <p className="font-medium text-gold-300">This player is already open in another tab.</p>
              <p className="mt-1 text-bone-300">Close that tab, or explicitly take over this player here.</p>
              <Button className="mt-3" size="sm" variant="gold" onClick={() => onResume(blockedChoice, true)}>Take Over</Button>
            </div>
          )}
          <div className="mt-6 space-y-3">
            {sessions.map((choice) => (
              <div key={choice.sessionKey} className="flex flex-col gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-semibold text-bone-50">{choice.session.displayName}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-bone-400">Room {choice.session.roomId}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onResume(choice)}><LogIn size={15} /> Resume</Button>
                  <Button size="sm" variant="ghost" onClick={() => onForget(choice.sessionKey)}><Trash2 size={15} /> Forget</Button>
                </div>
              </div>
            ))}
          </div>
          <Button className="mt-6" variant="ghost" fullWidth onClick={onCancel}>Start without resuming</Button>
        </section>
      </main>
    </div>
  );
}

export function SessionValidationUnavailablePage({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="pointer-events-none absolute inset-0 table-felt opacity-40" />
      <main className="relative z-10 w-full max-w-md surface-raised p-6 text-center sm:p-8">
        <div className="mb-6"><Logo size={34} /></div>
        <AlertTriangle className="mx-auto text-gold-400" size={34} />
        <h1 className="mt-4 font-display text-2xl font-semibold text-bone-50">Backend Unavailable</h1>
        <p className="mt-2 text-sm leading-relaxed text-bone-300">
          We couldn’t check this saved session. Your session is still saved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={onRetry}>Retry</Button>
          <Button variant="secondary" onClick={onBack}>Back</Button>
        </div>
      </main>
    </div>
  );
}
