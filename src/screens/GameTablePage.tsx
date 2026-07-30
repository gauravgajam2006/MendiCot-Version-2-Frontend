import { useState } from 'react';
import { LogOut, Hand, Info } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/Button';
import { Scoreboard } from '@/components/game/Scoreboard';
import { TrumpStatus } from '@/components/game/TrumpStatus';
import { CurrentTrick } from '@/components/game/CurrentTrick';
import { CardHand } from '@/components/game/CardHand';
import { PlayerSeat } from '@/components/game/PlayerSeat';
import { getSeatPositions, type SeatPosition } from '@/components/game/tableLayout';
import { Modal } from '@/components/ui/Modal';
import type { Card, Player, RoomState, TrumpState } from '@/types';

interface GameTablePageProps {
  room: RoomState;
  meId: string;
  hand: Card[];
  playableIds: Set<string>;
  trick: { leadSuit: Card['suit'] | null; cards: { playerId: string; card: Card }[]; currentPlayerId: string };
  trump: TrumpState;
  scores: Record<'A' | 'B', { name: string; tricks: number; tens: number }>;
  trickNumber: number;
  totalTricks: number;
  onPlayCard: (card: Card) => void;
  onLeave: () => void;
  onEndGame?: () => void;
}

export function GameTablePage({
  room,
  meId,
  hand,
  playableIds,
  trick,
  trump,
  scores,
  trickNumber,
  totalTricks,
  onPlayCard,
  onLeave,
  onEndGame,
}: GameTablePageProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const positions = getSeatPositions(room.config.playerCount);
  const isMyTurn = trick.currentPlayerId === meId;

  // Group players by their seat position. Bottom seat (the current player) is
  // rendered in the dedicated hand area, not on the table.
  const byPosition = (pos: SeatPosition) =>
    room.players.filter((_, i) => positions[i] === pos);

  const topPlayers = byPosition('top');
  const leftPlayers = byPosition('left');
  const rightPlayers = byPosition('right');
  const bottomPlayers = byPosition('bottom');
  const me = bottomPlayers.find((p) => p.id === meId) ?? room.players.find((p) => p.id === meId);

  const handleCardClick = (card: Card) => {
    if (!playableIds.has(card.id)) return;
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

  return (
    <div className="min-h-screen flex flex-col bg-ink-950">
      {/* Zone 1: top navigation */}
      <TopBar
        onBack={() => setConfirmLeave(true)}
        right={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowInfo(true)}>
              <Info size={15} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmLeave(true)}>
              <LogOut size={15} /> <span className="hidden sm:inline">Leave</span>
            </Button>
          </div>
        }
      />

      {/* Mobile/tablet status bar: trump + score + captured tens — same info as the desktop HUD */}
      <div className="lg:hidden border-b hairline bg-ink-900/60 px-3 py-2 flex flex-wrap items-center justify-center gap-2">
        <TrumpStatus trump={trump} compact />
        <Scoreboard scores={scores} compact />
        <CapturedTensPanel scores={scores} compact />
      </div>

      {/* Zone 2: table + HUD row, centered with consistent gap */}
      <div className="flex-1 flex justify-center px-3 py-3 sm:px-6 sm:py-5">
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch">
          {/* Table (grows) — taller for 6/8-player games so stacked seats don't collide */}
          <div className={[
            'flex-1 flex flex-col',
            room.config.playerCount >= 8
              ? 'min-h-[26rem] sm:min-h-[30rem] lg:min-h-0'
              : room.config.playerCount === 6
              ? 'min-h-[22rem] sm:min-h-[26rem] lg:min-h-0'
              : 'min-h-[18rem] sm:min-h-[22rem] lg:min-h-0',
          ].join(' ')}>
            <TableArea
              topPlayers={topPlayers}
              leftPlayers={leftPlayers}
              rightPlayers={rightPlayers}
              trick={trick}
              players={room.players}
              meId={meId}
              trickNumber={trickNumber}
              totalTricks={totalTricks}
            />
          </div>

          {/* HUD column — aligned to table, single clean stack */}
          <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-3">
            <Scoreboard scores={scores} tricksToWin={7} tensToWin={3} />
            <CapturedTensPanel scores={scores} />
            <TrumpStatus trump={trump} />
          </aside>
        </div>
      </div>

      {/* Zone 3: dedicated bottom hand area, separated from the table */}
      <div className="relative z-20 border-t hairline bg-ink-950/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-3 py-3 sm:py-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-eyebrow text-bone-400">Your hand · {hand.length} cards</span>
            {isMyTurn ? (
              <span className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-[0.14em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" />
                Your turn — select a card
              </span>
            ) : (
              <span className="text-2xs uppercase tracking-[0.14em] text-bone-400">
                Waiting for {room.players.find((p) => p.id === trick.currentPlayerId)?.displayName}
              </span>
            )}
          </div>
          <div className="flex justify-center">
            <CardHand
              cards={hand}
              playableIds={playableIds}
              selectedId={selectedId}
              onCardClick={handleCardClick}
              unplayableReason={unplayableReason}
              size="md"
              compact
            />
          </div>
          {selectedId && (
            <div className="mt-3 flex justify-center animate-fade-up">
              <Button onClick={confirmPlay}>
                <Hand size={16} /> Play selected card
              </Button>
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
      {onEndGame && (
        <button
          onClick={onEndGame}
          className="fixed bottom-4 left-4 z-50 rounded-full border border-ink-600 bg-ink-900/80 px-3 py-1.5 text-2xs uppercase tracking-wider text-bone-400 hover:text-bone-100 transition-colors"
        >
          End game (demo)
        </button>
      )}
    </div>
  );
}

function CapturedTensPanel({
  scores,
  compact = false,
}: {
  scores: Record<'A' | 'B', { name: string; tricks: number; tens: number }>;
  compact?: boolean;
}) {
  return (
    <div className={['surface', compact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'].join(' ')}>
      {!compact && <span className="label-eyebrow text-bone-400">Captured Tens (Mendis)</span>}
      <div className={['flex items-center justify-between gap-3', compact ? '' : 'mt-2'].join(' ')}>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-200 font-medium">Maroon</span>
          <span className="font-display text-sm font-semibold tabular-nums text-bone-50">{scores.A.tens}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gold-400" />
          <span className="text-xs text-gold-200 font-medium">Gold</span>
          <span className="font-display text-sm font-semibold tabular-nums text-bone-50">{scores.B.tens}</span>
        </div>
      </div>
    </div>
  );
}

function TableArea({
  topPlayers,
  leftPlayers,
  rightPlayers,
  trick,
  players,
  meId,
  trickNumber,
  totalTricks,
}: {
  topPlayers: Player[];
  leftPlayers: Player[];
  rightPlayers: Player[];
  trick: { leadSuit: Card['suit'] | null; cards: { playerId: string; card: Card }[]; currentPlayerId: string };
  players: Player[];
  meId: string;
  trickNumber: number;
  totalTricks: number;
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
          <div className="relative z-10 flex flex-wrap justify-center gap-2 sm:gap-3 pt-2 px-2">
            {topPlayers.map((p) => (
              <PlayerSeat
                key={p.id}
                player={p}
                isCurrentTurn={trick.currentPlayerId === p.id}
                isMe={p.id === meId}
                showCardsRemaining
              />
            ))}
          </div>

          {/* MIDDLE row: LEFT seats | center trick | RIGHT seats */}
          <div className="relative z-10 flex-1 flex items-center justify-between gap-2 sm:gap-3 px-1 sm:px-2 min-w-0">
            <div className="flex flex-col gap-2 sm:gap-3 shrink sm:shrink-0 min-w-[4.5rem]">
              {leftPlayers.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isCurrentTurn={trick.currentPlayerId === p.id}
                  isMe={p.id === meId}
                  showCardsRemaining
                  variant="inline"
                />
              ))}
            </div>

            <div className="flex-1 flex items-center justify-center min-w-0">
              <div className="w-full max-w-md min-w-0">
                <CurrentTrick
                  cards={trick.cards}
                  leadSuit={trick.leadSuit}
                  players={players}
                  currentPlayerId={trick.currentPlayerId}
                  meId={meId}
                  trickNumber={trickNumber}
                  totalTricks={totalTricks}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 shrink sm:shrink-0 min-w-[4.5rem]">
              {rightPlayers.map((p) => (
                <PlayerSeat
                  key={p.id}
                  player={p}
                  isCurrentTurn={trick.currentPlayerId === p.id}
                  isMe={p.id === meId}
                  showCardsRemaining
                  variant="inline"
                />
              ))}
            </div>
          </div>

          {/* BOTTOM spacer — bottom seat lives in the hand area */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
