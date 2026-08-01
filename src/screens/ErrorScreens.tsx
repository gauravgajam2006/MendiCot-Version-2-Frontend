import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { LogoMark } from '@/components/Logo';
import { AlertTriangle, Home, RefreshCw, WifiOff, Users } from 'lucide-react';

type ErrorKind =
  | 'room-not-found'
  | 'room-full'
  | 'game-started'
  | 'invalid-request'
  | 'disconnected'
  | 'generic';

const errorContent: Record<ErrorKind, { title: string; description: string; icon: typeof AlertTriangle }> = {
  'room-not-found': {
    title: 'Incorrect Room Code',
    description: 'Please check the room code and try again.',
    icon: Users,
  },
  'room-full': {
    title: 'Room is full',
    description: 'All seats at this table are taken. Ask the host to make room or try another code.',
    icon: Users,
  },
  'game-started': {
    title: 'Game already started',
    description: 'This table is mid-game. You can join the next round once it ends.',
    icon: AlertTriangle,
  },
  'invalid-request': {
    title: 'Invalid request',
    description: 'Please check the room code and your display name, then try again.',
    icon: AlertTriangle,
  },
  disconnected: {
    title: 'You went offline',
    description: 'Your connection dropped. Try reconnecting to rejoin the table.',
    icon: WifiOff,
  },
  generic: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.',
    icon: AlertTriangle,
  },
};

interface ErrorScreenProps {
  kind: ErrorKind;
  onRetry?: () => void;
  onHome: () => void;
}
export function ErrorScreen({ kind, onRetry, onHome }: ErrorScreenProps) {
  const cfg = errorContent[kind];
  const Icon = cfg.icon;
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-full border border-crimson-500/30 bg-crimson-500/10">
          <Icon size={24} className="text-crimson-400" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-bone-50">{cfg.title}</h1>
        <p className="mt-2 text-bone-300 leading-relaxed">{cfg.description}</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          {onRetry && (
            <Button onClick={onRetry}>
              <RefreshCw size={15} /> Try again
            </Button>
          )}
          <Button variant="secondary" onClick={onHome}>
            <Home size={15} /> Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}
export function ConnectingScreen({ label = 'Connecting to the room' }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <LogoMark size={56} className="animate-pulse-soft" />
      </div>
      <LoadingState title={label} description="Setting up your seat at the table." />
    </div>
  );
}
