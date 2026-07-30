import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { InlineMessage } from '@/components/ui/Toast';
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '@/utils/roomCode';

interface JoinRoomPageProps {
  onBack: () => void;
  onJoin: (input: { code: string; name: string }) => void;
}

export function JoinRoomPage({ onBack, onJoin }: JoinRoomPageProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState({ code: false, name: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedCode = normalizeRoomCode(code);
  const codeError = touched.code && normalizedCode.length !== ROOM_CODE_LENGTH ? 'Room code is 8 characters' : undefined;
  const nameError = touched.name && name.trim().length < 2 ? 'Enter a display name (2+ characters)' : undefined;

  const submit = () => {
    setTouched({ code: true, name: true });
    if (normalizedCode.length !== ROOM_CODE_LENGTH || name.trim().length < 2) return;
    setLoading(true);
    setError(null);
    // Simulate join attempt; the parent will navigate on success.
    setTimeout(() => {
      setLoading(false);
      onJoin({ code: code.trim().toUpperCase(), name: name.trim() });
    }, 700);
  };

  return (
    <div className="min-h-screen">
      <TopBar onBack={onBack} />

      <div className="mx-auto max-w-md px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 animate-fade-up">
          <span className="label-eyebrow text-emerald-400">Join a table</span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-brand text-bone-50">
            Join a room
          </h1>
          <p className="mt-2 text-bone-300">Enter the code your friend shared to take a seat.</p>
        </div>

        <div className="space-y-5">
          <Field label="Room code" error={codeError}>
            <TextInput
              value={code}
              onChange={(e) => setCode(normalizeRoomCode(e.target.value))}
              onBlur={() => setTouched((t) => ({ ...t, code: true }))}
              placeholder="e.g. 7KQD2M9A"
              invalid={!!codeError}
              maxLength={ROOM_CODE_LENGTH}
              className="font-display tracking-[0.3em] uppercase text-center"
              autoFocus
            />
          </Field>

          <Field label="Your display name" error={nameError}>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="e.g. Priya"
              invalid={!!nameError}
              maxLength={20}
            />
          </Field>

          {error && (
            <InlineMessage kind="error" title={error}>
              Check the code with your friend and try again.
            </InlineMessage>
          )}

          <Button size="lg" fullWidth onClick={submit} loading={loading}>
            {!loading && <LogIn size={16} />}
            {loading ? 'Joining…' : 'Join Room'}
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-bone-400">
          Don't have a code?{' '}
          <button onClick={onBack} className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline">
            Create a room
          </button>
        </p>
      </div>
    </div>
  );
}
