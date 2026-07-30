import { ArrowRight, Users, Zap } from 'lucide-react';
import { Logo, LogoMark } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

interface LandingPageProps {
  onCreate: () => void;
  onJoin: () => void;
}

export function LandingPage({ onCreate, onJoin }: LandingPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0 table-felt opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/60 via-transparent to-ink-950" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size={30} />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onJoin}>
            Join Room
          </Button>
          <Button variant="primary" size="sm" onClick={onCreate}>
            Create Room
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pt-12 sm:pt-16 md:pt-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900/60 px-3 py-1 text-2xs uppercase tracking-[0.18em] text-bone-300 animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
          Real-time multiplayer
        </div>

        <div className="mb-8 flex justify-center animate-fade-up">
          <LogoMark size={72} />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-semibold tracking-tightest text-bone-50 text-balance animate-fade-up">
          The Indian trick-taking game,
          <br />
          <span className="text-emerald-400">brought to the table.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base sm:text-lg text-bone-300 leading-relaxed text-balance animate-fade-up">
          MendiCot is a competitive four-card trick game for two teams. Capture tens, win
          tricks, and outplay your rivals in real time — with 4, 6, or 8 players at a table.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto animate-fade-up">
          <Button size="lg" onClick={onCreate} className="group">
            Create a Room
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button size="lg" variant="secondary" onClick={onJoin}>
            Join with Code
          </Button>
        </div>

        {/* Player count chips */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-bone-400">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-emerald-400" />
            <span className="text-sm">4 · 6 · 8 players</span>
          </div>
          <div className="h-4 w-px bg-ink-600" />
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-gold-400" />
            <span className="text-sm">Two teams</span>
          </div>
        </div>
      </main>

      {/* How it works strip */}
      <section className="relative z-10 mx-auto mt-16 sm:mt-20 max-w-4xl px-4 pb-16 sm:pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border hairline bg-ink-700">
          {[
            { n: '01', t: 'Create or join', d: 'Start a room and share the code, or join a friend\'s table in seconds.' },
            { n: '02', t: 'Pick your mode', d: 'Normal trump or hidden trump — choose how the trump suit is decided.' },
            { n: '03', t: 'Play the hand', d: 'Follow suit, capture tens, and win the most tricks for your team.' },
          ].map((s) => (
            <div key={s.n} className="bg-ink-900/80 px-5 py-6 text-left">
              <span className="font-display text-sm text-emerald-400">{s.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold text-bone-50">{s.t}</h3>
              <p className="mt-1.5 text-sm text-bone-300 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-6 text-2xs uppercase tracking-[0.14em] text-bone-500">
          <span>MendiCot</span>
          <span>A traditional Indian card game</span>
        </div>
      </footer>
    </div>
  );
}
