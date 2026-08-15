import { useEffect, useState } from 'react';
import { LogOut, Hand, Info } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Scoreboard } from '@/components/game/Scoreboard';
import { CurrentTrickLeader } from '@/components/game/CurrentTrickLeader';
import { TrumpStatus } from '@/components/game/TrumpStatus';
import { CurrentTrick } from '@/components/game/CurrentTrick';
import { LeadSuitPanel } from '@/components/game/LeadSuitPanel';
import { CardHand } from '@/components/game/CardHand';
import { PlayerSeat } from '@/components/game/PlayerSeat';
import { getRelativeSeating, type SeatPosition } from '@/components/game/tableLayout';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import type { BackendGamePhase } from '@/api';
import { SUIT_IS_RED, SUIT_NAME, SUIT_SYMBOL } from '@/types';
import type { Card, Player, RoomState, Suit, TrickLeaderState, TrumpState } from '@/types';

import { HiddenTrumpRevealOverlay } from '@/components/game/HiddenTrumpRevealOverlay';
import { CardInspectOverlay } from '@/components/game/CardInspectOverlay';
import { TurnAlertQuickControl } from '@/components/TurnAlertControls';
import { useTurnAlertReminder } from '@/hooks/useTurnAlertReminder';
import { useCardInspect, type CardInspectTarget, type InspectHandlers } from '@/hooks/useCardInspect';

interface GameTablePageProps {
  room: RoomState;
  meId: string;
  phase: BackendGamePhase;
  hand: Card[];
  playableIds: Set<string>;
  trick: { leadSuit: Card['suit'] | null; cards: { playerId: string; card: Card }[]; currentPlayerId: string | null };
  currentTrickLeader: TrickLeaderState | null;
  trump: TrumpState;
  trumpHiderId: string | null;
  scores: Record<'A' | 'B', { name: string; tricks: number; tens: number; capturedMendis: Suit[] }>;
  trickNumber: number;
  totalTricks: number;
  onPlayCard: (card: Card) => void;
  onRevealTrump: () => void;
  onLeave: () => void;
  pending: boolean;
  message: string | null;
  gameId: string;
  gameVersion: number;
  connected: boolean;
}

export function GameTablePage({
  room,
  meId,
  phase,
  hand,
  playableIds,
  trick,
  currentTrickLeader,
  trump,
  trumpHiderId,
  scores,
  trickNumber,
  totalTricks,
  onPlayCard,
  onRevealTrump,
  onLeave,
  pending,
  message,
  gameId,
  gameVersion,
  connected,
}: GameTablePageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const { inspectedTarget, getInspectHandlers, closeInspect } = useCardInspect();

  const seating = getRelativeSeating(room.players, meId, room.config.playerCount);
  const isMyTurn = trick.currentPlayerId === meId;
  const isResolving = phase === 'TRICK_RESOLUTION';
  const isFinalScoreDisplay = phase === 'FINAL_SCORE_DISPLAY';

  useTurnAlertReminder({ meId, currentTurnPlayerId: trick.currentPlayerId, phase, gameId, gameVersion, connected });

  useEffect(() => {
    if (selectedId && !hand.some((card) => card.id === selectedId)) setSelectedId(null);
  }, [hand, selectedId]);

  useEffect(() => {
    if (isFinalScoreDisplay) setSelectedId(null);
  }, [isFinalScoreDisplay]);

  useEffect(() => {
    if (!seating.currentPlayer) {
      console.warn('[Game Table] Current player is absent from the authoritative player snapshot; waiting to synchronize.', {
        configuredPlayerCount: room.config.playerCount,
        receivedPlayerCount: room.players.length,
      });
    }
  }, [room.config.playerCount, room.players.length, seating.currentPlayer]);

  // Relative seat zero is rendered in the dedicated hand area, never here.
  const byPosition = (pos: SeatPosition) =>
    seating.remotePositions
      .filter((seat) => seat.position === pos)
      .map((seat) => seat.player);

  const topPlayers = byPosition('top');
  // Render the left stack top-to-bottom while circular order travels bottom-to-top.
  const leftPlayers = byPosition('left').reverse();
  const rightPlayers = byPosition('right');
  const handleCardClick = (card: Card) => {
    if (pending || isResolving || isFinalScoreDisplay || !isMyTurn || !playableIds.has(card.id)) return;
    setSelectedId((prev) => (prev === card.id ? null : card.id));
  };

  const confirmPlay = () => {
    const card = hand.find((c) => c.id === selectedId);
    if (card) {
      onPlayCard(card);
      setSelectedId(null);
    }
  };

  const unplayableReason = (card: Card) => {
    if (trick.leadSuit) {
      const hasLead = hand.some((c) => c.suit === trick.leadSuit);
      if (hasLead && card.suit !== trick.leadSuit) {
        return `You must follow ${trick.leadSuit}.`;
      }
    }
    return undefined;
  };

  if (!seating.currentPlayer) {
    return (
      <div className="min-h-screen flex flex-col bg-ink-950">
        <TopBar onBack={() => setConfirmLeave(true)} />
        <main className="flex-1 grid place-items-center px-4">
          <LoadingState
            title="Synchronizing table"
            description="Waiting for your authoritative seat before placing players."
          />
        </main>
        <Modal
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title="Leave the game?"
          description="You'll be disconnected from this table. The host may need to find a replacement."
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmLeave(false)}>Stay</Button>
              <Button variant="danger" onClick={onLeave}>Leave</Button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      {/* Zone 1: top navigation */}
      <TopBar
        showLogo={false}
        onBack={() => setConfirmLeave(true)}
        right={
          <div className="flex items-center gap-2">
            <TurnAlertQuickControl />
            <Button variant="ghost" size="sm" onClick={() => setShowInfo(true)}>
              <Info size={15} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
              <LogOut size={15} /> <span className="hidden sm:inline">Leave</span>
            </Button>
          </div>
        }
      />

      {/* Mobile/tablet status bar: trump + score + captured tens */}
      <div className="lg:hidden border-b hairline bg-ink-900/60 px-3 py-2 flex flex-wrap items-center justify-center gap-2">
        <TrumpStatus trump={trump} compact />
        <Scoreboard scores={scores} compact />
        <CurrentTrickLeader leader={currentTrickLeader} compact />
      </div>

      {/* Zone 2: table + HUD row, centered with consistent gap */}
      <div className="flex-1 flex justify-center px-3 py-3 sm:px-6 sm:py-5">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch">
          {/* Table (grows) — taller for 6/8-player games so stacked seats don't collide */}
          <div className={[
            'flex-1 flex flex-col',
            room.config.playerCount >= 8
              ? 'min-h-[34rem] sm:min-h-[34rem] lg:min-h-0'
              : room.config.playerCount === 6
              ? 'min-h-[30rem] sm:min-h-[30rem] lg:min-h-0'
              : 'min-h-[26rem] sm:min-h-[26rem] lg:min-h-0',
          ].join(' ')}>
            <TableArea
              topPlayers={topPlayers}
              leftPlayers={leftPlayers}
              rightPlayers={rightPlayers}
              trick={trick}
              phase={phase}
              currentTrickLeader={currentTrickLeader}
              players={room.players}
              meId={meId}
              trickNumber={trickNumber}
              totalTricks={totalTricks}
              trump={trump}
              trumpHiderId={trumpHiderId}
              getInspectHandlers={getInspectHandlers}
            />
          </div>

          {/* HUD column — aligned to table, single clean stack */}
          <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-3 min-w-0">
            <Scoreboard scores={scores} tricksToWin={7} tensToWin={3} />
            <CurrentTrickLeader leader={currentTrickLeader} />
            <LeadSuitPanel leadSuit={trick.leadSuit} />
            <TrumpStatus trump={trump} />
          </aside>
        </div>
      </div>

      {/* Zone 3: dedicated bottom hand area, separated from the table */}
      <div className="relative z-20 border-t hairline bg-ink-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-eyebrow text-bone-400">Your hand · {hand.length} cards</span>
            {isFinalScoreDisplay ? (
              <span role="status" className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-gold-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse-soft" /> Final score
              </span>
            ) : isResolving ? (
              <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-gold-300">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse-soft" /> Resolving trick…
              </span>
            ) : isMyTurn ? (
              <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                Your turn — select a card
              </span>
            ) : (
              <span className="text-2xs uppercase tracking-[0.14em] text-bone-400">
                {trick.currentPlayerId ? `Waiting for ${room.players.find((p) => p.id === trick.currentPlayerId)?.displayName ?? 'player'}` : 'Resolving trick…'}
              </span>
            )}
          </div>
          <div className="w-full min-w-0 flex justify-center">
            <CardHand
              cards={hand}
              playableIds={pending || isResolving || isFinalScoreDisplay ? new Set() : playableIds}
              selectedId={selectedId}
              onCardClick={handleCardClick}
              unplayableReason={unplayableReason}
              getInspectHandlers={getInspectHandlers}
            />
          </div>
          {(message || pending) && (
            <p role="status" className={['mt-3 text-center text-sm', message ? 'text-crimson-300' : 'text-bone-400'].join(' ')}>
              {message ?? 'Waiting for the table to confirm your action…'}
            </p>
          )}
          {!isResolving && !isFinalScoreDisplay && phase === 'PLAYING' && (selectedId || (isMyTurn && trick.leadSuit && trump.kind === 'hidden' && !hand.some((card) => card.suit === trick.leadSuit))) && (
            <div className="mt-3 flex flex-wrap gap-2 justify-center animate-fade-up">
              {selectedId && <Button disabled={pending} onClick={confirmPlay}>
                <Hand size={16} /> {pending ? 'Playing…' : 'Play selected card'}
              </Button>}
              {isMyTurn && trick.leadSuit && trump.kind === 'hidden' && !hand.some((card) => card.suit === trick.leadSuit) && (
                <Button variant="secondary" disabled={pending} onClick={onRevealTrump}>Reveal trump</Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Leave the game?"
        description="You'll be disconnected from this table. The host may need to find a replacement."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLeave(false)}>Stay</Button>
            <Button variant="danger" onClick={onLeave}>Leave</Button>
          </>
        }
      />
      <Modal
        open={showInfo}
        onClose={() => setShowInfo(false)}
        title="How to play this hand"
        description="MendiCot is a trick-taking game. Follow the lead suit if you can. The highest trump — or the highest card of the lead suit if no trump is played — wins the trick. Capture tens to score Mendis."
        footer={<Button variant="ghost" onClick={() => setShowInfo(false)}>Got it</Button>}
      />

      <CardInspectOverlay target={inspectedTarget} onClose={closeInspect} />
    </div>
  );
}

function TableArea({
  topPlayers,
  leftPlayers,
  rightPlayers,
  trick,
  phase,
  currentTrickLeader,
  players,
  meId,
  trickNumber,
  totalTricks,
  trump,
  trumpHiderId,
  getInspectHandlers,
}: {
  topPlayers: Player[];
  leftPlayers: Player[];
  rightPlayers: Player[];
  trick: { leadSuit: Card['suit'] | null; cards: { playerId: string; card: Card }[]; currentPlayerId: string | null };
  phase: BackendGamePhase;
  currentTrickLeader: TrickLeaderState | null;
  players: Player[];
  meId: string;
  trickNumber: number;
  totalTricks: number;
  trump: TrumpState;
  trumpHiderId: string | null;
  getInspectHandlers?: (target: CardInspectTarget | null) => InspectHandlers | undefined;
}) {
  return (
    <div className="relative flex-1 flex flex-col">
      {/* Felt surface — fills the area with controlled padding */}
      <div className="relative flex-1 rounded-[1.75rem] table-rim p-4 sm:p-5 flex flex-col">
        <div className="relative flex-1 rounded-[1.4rem] table-felt shadow-inset flex flex-col">
          {/* Center emblem */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.06] pointer-events-none">
            <span className="font-display text-7xl text-bone-50 select-none">M</span>
          </div>

          {/* TOP seats */}
          <div className="relative z-10 flex flex-wrap justify-center gap-2 sm:gap-3 pt-3 px-2 lg:pt-12">
            {topPlayers.map((p) => (
              <PlayerSeat
                key={p.id}
                player={p}
                isCurrentTurn={trick.currentPlayerId === p.id}
                showCardsRemaining
              />
            ))}
          </div>

          <HiddenTrumpRevealOverlay
            phase={phase}
            players={players}
            trump={trump}
            meId={meId}
            trumpHiderId={trumpHiderId}
            getInspectHandlers={getInspectHandlers}
          />

          <div className="lg:hidden relative z-10 px-2 pt-2">
            <MobileTableStatus
              trickNumber={trickNumber}
              totalTricks={totalTricks}
              currentPlayerId={trick.currentPlayerId}
              meId={meId}
              phase={phase}
              players={players}
              leadSuit={trick.leadSuit}
            />
          </div>

          {/* Mobile: side seats occupy a dedicated upper row; cards reserve the lower zone. */}
          <div className="lg:hidden relative z-10 flex-1 min-h-[18rem] px-2">
            <div className="absolute left-1 top-3 z-10 flex max-w-[46%] flex-col gap-2">
              {leftPlayers.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isCurrentTurn={trick.currentPlayerId === p.id}
                  showCardsRemaining
                  variant="inline"
                />
              ))}
            </div>
            <div className="absolute right-1 top-3 z-10 flex max-w-[46%] flex-col items-end gap-2">
              {rightPlayers.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isCurrentTurn={trick.currentPlayerId === p.id}
                  showCardsRemaining
                  variant="inline"
                />
              ))}
            </div>
            <div className="flex h-full min-w-0 items-end justify-center pb-2 pt-28">
              <div className="w-full max-w-md min-w-0">
                <CurrentTrick
                  cards={trick.cards}
                  phase={phase}
                  currentTrickLeader={currentTrickLeader}
                  players={players}
                  getInspectHandlers={getInspectHandlers}
                />
              </div>
            </div>
          </div>

          {/* Desktop: LEFT seats | center trick | RIGHT seats */}
          <div className="relative z-10 hidden flex-1 items-center justify-between gap-3 px-2 min-w-0 lg:flex">
            <div className="flex flex-col gap-2 sm:gap-3 shrink sm:shrink-0 min-w-[4.5rem]">
              {leftPlayers.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isCurrentTurn={trick.currentPlayerId === p.id}
                  showCardsRemaining
                  variant="inline"
                />
              ))}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <div className="w-full max-w-md min-w-0">
                <CurrentTrick
                  cards={trick.cards}
                  phase={phase}
                  currentTrickLeader={currentTrickLeader}
                  players={players}
                  getInspectHandlers={getInspectHandlers}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 shrink sm:shrink-0 min-w-[4.5rem]">
              {rightPlayers.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isCurrentTurn={trick.currentPlayerId === p.id}
                  showCardsRemaining
                  variant="inline"
                />
              ))}
            </div>
          </div>

          {/* BOTTOM spacer — bottom seat lives in the hand area */}
          <div className="h-2" />

          <div className="absolute left-3 top-3 z-20 hidden lg:block">
            <TrickBadge trickNumber={trickNumber} totalTricks={totalTricks} />
          </div>
          <div className="absolute right-3 top-3 z-20 hidden lg:block">
            <TurnBadge currentPlayerId={trick.currentPlayerId} meId={meId} phase={phase} players={players} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrickBadge({ trickNumber, totalTricks }: { trickNumber: number; totalTricks: number }) {
  return (
    <div aria-label={`Current trick ${trickNumber} of ${totalTricks}`} className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900/85 px-2.5 py-1">
      <span className="label-eyebrow text-bone-400">Trick</span>
      <span className="text-2xs font-semibold tabular-nums text-bone-100">{trickNumber}/{totalTricks}</span>
    </div>
  );
}

function TurnBadge({
  currentPlayerId,
  meId,
  phase,
  players,
  compact = false,
}: {
  currentPlayerId: string | null;
  meId: string;
  phase: BackendGamePhase;
  players: Player[];
  compact?: boolean;
}) {
  const isMyTurn = currentPlayerId === meId;
  const label = phase === 'FINAL_SCORE_DISPLAY'
    ? 'Final score'
    : phase === 'TRICK_RESOLUTION'
    ? 'Resolving trick'
    : isMyTurn
      ? 'Your turn'
      : currentPlayerId
        ? `${players.find((player) => player.id === currentPlayerId)?.displayName ?? 'Player'}'s turn`
        : 'Waiting for next trick';
  return (
    <div aria-label={`Current turn: ${label}`} className={[
      `inline-flex ${compact ? 'max-w-[10rem]' : 'max-w-[12rem]'} items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium uppercase tracking-[0.14em] transition-colors`,
      isMyTurn ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40' : 'bg-ink-800 text-bone-300',
    ].join(' ')}>
      <span className={['h-1.5 w-1.5 shrink-0 rounded-full', isMyTurn ? 'bg-emerald-400 animate-pulse-soft' : 'bg-bone-400'].join(' ')} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function MobileTableStatus({
  trickNumber,
  totalTricks,
  currentPlayerId,
  meId,
  phase,
  players,
  leadSuit,
}: {
  trickNumber: number;
  totalTricks: number;
  currentPlayerId: string | null;
  meId: string;
  phase: BackendGamePhase;
  players: Player[];
  leadSuit: Card['suit'] | null;
}) {
  return (
    <section aria-label="Current trick status" className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-1">
      <TrickBadge trickNumber={trickNumber} totalTricks={totalTricks} />
      <TurnBadge currentPlayerId={currentPlayerId} meId={meId} phase={phase} players={players} compact />
      <div aria-label={`Lead suit: ${leadSuit ? SUIT_NAME[leadSuit] : 'not set'}`} className="flex basis-full items-center justify-center gap-1.5 whitespace-nowrap text-2xs text-bone-300">
        <span className="font-medium uppercase tracking-[0.12em] text-bone-400">Lead:</span>
        <span className={['whitespace-nowrap', leadSuit && SUIT_IS_RED[leadSuit] ? 'font-semibold text-crimson-400' : leadSuit ? 'font-semibold text-bone-100' : 'text-bone-400'].join(' ')}>
          {leadSuit ? `${SUIT_SYMBOL[leadSuit]} ${SUIT_NAME[leadSuit]}` : 'Not set'}
        </span>
      </div>
    </section>
  );
}
