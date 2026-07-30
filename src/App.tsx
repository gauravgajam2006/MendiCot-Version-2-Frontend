import { useCallback, useEffect, useRef, useState } from 'react';
import { LandingPage } from '@/screens/LandingPage';
import { CreateRoomPage } from '@/screens/CreateRoomPage';
import { JoinRoomPage } from '@/screens/JoinRoomPage';
import { LobbyPage } from '@/screens/LobbyPage';
import { HostSetupPage } from '@/screens/HostSetupPage';
import { HiddenTrumpPage } from '@/screens/HiddenTrumpPage';
import { GameTablePage } from '@/screens/GameTablePage';
import { GameEndPage } from '@/screens/GameEndPage';
import { ErrorScreen, ConnectingScreen } from '@/screens/ErrorScreens';
import { ReconnectBanner } from '@/components/ui/ReconnectBanner';
import { ToastStack } from '@/components/ui/Toast';
import { adaptRoomState, ApiError, createRoom, GameSocket, joinRoom } from '@/api';
import type { BackendRoomState, RoomStateUpdateMessage, WsInboundMessage } from '@/api';
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '@/utils/roomCode';
import { clearRoomSession, migrateLegacySession, saveRoomSession } from '@/utils/roomSession';
import type { RoomSession } from '@/utils/roomSession';
import type { ToastMessage } from '@/types';
import {
  ME_ID,
  generatePlayers,
  mockHand,
  mockPlayableIds,
  mockScores,
  mockTrick,
  mockTrump,
} from '@/mockData';
import type { Card, GameScreen, PlayerCount, ReconnectState, RoomState, TeamId, TrumpMode } from '@/types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSafeErrorDetails(error: unknown): Record<string, string | number> {
  if (error instanceof ApiError) {
    return { kind: 'api', status: error.status, statusText: error.statusText };
  }
  if (error instanceof Error) {
    return { kind: 'error', name: error.name };
  }
  return { kind: typeof error };
}

function isBackendRoomState(value: unknown): value is BackendRoomState {
  if (!isObject(value)) return false;

  return typeof value.room_id === 'string'
    && (value.status === 'WAITING' || value.status === 'IN_GAME')
    && (value.host_id === null || typeof value.host_id === 'string')
    && (value.player_count === 4 || value.player_count === 6 || value.player_count === 8)
    && (value.trump_mode === 'normal' || value.trump_mode === 'hidden')
    && Array.isArray(value.players)
    && value.players.every((player) => isObject(player)
      && typeof player.player_id === 'string'
      && typeof player.display_name === 'string'
      && typeof player.is_online === 'boolean');
}

function getBackendDetail(body: unknown): string | null {
  if (!isObject(body) || typeof body.detail !== 'string') return null;
  return body.detail;
}

function mapJoinError(error: unknown): 'room-not-found' | 'room-full' | 'game-started' | 'generic' {
  if (!(error instanceof ApiError)) return 'generic';

  const detail = getBackendDetail(error.body)?.toLowerCase() ?? '';
  const isGameStarted = detail.includes('already started')
    || detail.includes('game has started')
    || detail.includes('cannot join room after');
  const isRoomFull = /\bfull\b|\bcapacity\b|reached\s+maximum|configured\s+capacity/.test(detail);

  if (error.status === 404 || detail.includes('not found')) return 'room-not-found';
  if (isGameStarted) return 'game-started';
  if (isRoomFull) return 'room-full';
  return 'generic';
}
function isSessionRejectionClose(code: number, reason: string): boolean {
  return code === 1008
    || (code >= 4000 && code < 5000)
    || /auth|token|policy|forbidden|room.*not.*found/i.test(reason);
}
function createInitialRoomState(): RoomState {
  return {
    config: { code: 'DEMO1234', playerCount: 4, trumpMode: 'normal' },
    players: generatePlayers(4),
    hostId: ME_ID,
    teams: { A: 'Team Maroon', B: 'Team Gold' },
  };
}

function App() {
  const [screen, setScreen] = useState<GameScreen>('landing');
  const [connecting, setConnecting] = useState(() => Boolean(migrateLegacySession()));
  const [errorKind, setErrorKind] = useState<
    'room-not-found' | 'room-full' | 'game-started' | 'disconnected' | 'generic' | null
  >(null);
  const [reconnect, setReconnect] = useState<ReconnectState>('connected');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(ME_ID);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const socketRef = useRef<GameSocket | null>(null);
  const isLeavingRef = useRef(false);
  const connectionAttemptRef = useRef(0);


  const [room, setRoom] = useState<RoomState>(createInitialRoomState);

  const [trump, setTrump] = useState(mockTrump);
  const [trick, setTrick] = useState(mockTrick);
  const [scores] = useState(mockScores);
  const [winningTeam, setWinningTeam] = useState<TeamId>('A');
  const [trickNumber, setTrickNumber] = useState(5);

  const closeActiveSocket = useCallback(() => {
    connectionAttemptRef.current += 1;
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
  }, []);

  const clearStoredSession = useCallback(() => {
    clearRoomSession();
  }, []);

  const clearRuntimeConnection = useCallback(() => {
    closeActiveSocket();
    setRoomId(null);
    setCurrentPlayerId(ME_ID);
    setSessionToken(null);
    setRoom(createInitialRoomState());
    setTrump(mockTrump);
    setTrick(mockTrick);
    setTrickNumber(5);
    setWinningTeam('A');
    setReconnect('connected');
    clearStoredSession();
  }, [clearStoredSession, closeActiveSocket]);

  useEffect(() => () => closeActiveSocket(), [closeActiveSocket]);

  const pushToast = useCallback((t: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));

  const isConnectedToBackendRoom = roomId !== null && sessionToken !== null;
  const restoreStoredSession = useCallback((savedSession: RoomSession) => {
    const { roomId: storedRoomId, playerId: storedPlayerId, sessionToken: storedSessionToken } = savedSession;
    let receivedInitialRoomState = false;

    setRoomId(storedRoomId);
    setCurrentPlayerId(storedPlayerId);
    setSessionToken(storedSessionToken);
    closeActiveSocket();
    const attempt = connectionAttemptRef.current + 1;
    connectionAttemptRef.current = attempt;
    const socket = new GameSocket({
      onOpen: () => {
        if (connectionAttemptRef.current !== attempt || socketRef.current !== socket) return;
      },
      onMessage: (message: WsInboundMessage) => {
        if (connectionAttemptRef.current !== attempt || socketRef.current !== socket) return;
        if (message.type === 'ROOM_STATE_UPDATE') {
          if (!isBackendRoomState(message.payload)) {
            console.warn('[Session Restore] Invalid initial room state; clearing saved session.');
            socketRef.current = null;
            socket.close();
            clearRuntimeConnection();
            setScreen('landing');
            setConnecting(false);
            setErrorKind(null);
            return;
          }
          receivedInitialRoomState = true;
          setRoom(adaptRoomState(message.payload));
          setCurrentPlayerId(storedPlayerId);
          setScreen('lobby');
          setConnecting(false);
          setReconnect('connected');
          return;
        }
        if (message.type === 'GAME_STATE_UPDATE') {
          console.warn('[Session Restore] Initial room state was not received; clearing saved session.');
          socketRef.current = null;
          socket.close();
          clearRuntimeConnection();
          setScreen('landing');
          setConnecting(false);
          setErrorKind(null);
        }
      },
      onClose: (code, reason) => {
        if (connectionAttemptRef.current !== attempt || socketRef.current !== socket || isLeavingRef.current) return;
        socketRef.current = null;
        if (!receivedInitialRoomState) {
          const rejectionDetail = isSessionRejectionClose(code, reason) ? 'rejected' : 'closed before room state';
          console.warn('[Session Restore] Saved session %s; clearing it.', rejectionDetail, { code, reason });
          socket.close();
          clearRuntimeConnection();
          setScreen('landing');
          setConnecting(false);
          setErrorKind(null);
          return;
        }
        console.error('[Session Restore] Room WebSocket closed.', { code, reason });
        setConnecting(false);
        setReconnect('offline');
        setErrorKind('generic');
      },
      onError: () => {
        if (connectionAttemptRef.current !== attempt || socketRef.current !== socket || isLeavingRef.current) return;
        console.error('[Session Restore] Room WebSocket encountered an error.');
      },
    });

    socketRef.current = socket;
    setReconnect('reconnecting');
    socket.connect(storedRoomId, storedSessionToken);
    return socket;
  }, [clearRuntimeConnection, closeActiveSocket]);

  useEffect(() => {
    const savedSession = migrateLegacySession();
    if (!savedSession) return;

    setConnecting(true);
    setErrorKind(null);
    const socket = restoreStoredSession(savedSession);
    return () => {
      if (socketRef.current === socket) closeActiveSocket();
    };
  }, [closeActiveSocket, restoreStoredSession]);

  const goHome = () => {
    closeActiveSocket();
    setReconnect('connected');
    setCurrentPlayerId(ME_ID);
    setScreen('landing');
    setErrorKind(null);
    setConnecting(false);
  };

  const handleLeave = async () => {
    if (isLeavingRef.current) return;

    const socket = socketRef.current;
    const hasBackendRoomSession = isConnectedToBackendRoom && socket !== null;
    isLeavingRef.current = true;

    try {
      if (hasBackendRoomSession) {
        const result = await socket.leaveRoom();
        if (result !== 'acknowledged') {
          console.warn('[Leave Room] Backend leave was not acknowledged before disconnect.', { result });
        }
      }
    } finally {
      clearRuntimeConnection();
      setCurrentPlayerId(ME_ID);
      setScreen('landing');
      setErrorKind(null);
      setConnecting(false);
      isLeavingRef.current = false;
    }
  };
  const handleCreate = async (cfg: { name: string; playerCount: PlayerCount; trumpMode: TrumpMode }) => {
    setConnecting(true);
    setErrorKind(null);

    try {
      const createdRoom = await createRoom({
        player_count: cfg.playerCount,
        trump_mode: cfg.trumpMode,
      });
      const playerId = crypto.randomUUID();
      const joinedRoom = await joinRoom(createdRoom.room_id, {
        player_id: playerId,
        display_name: cfg.name,
      });

      setRoomId(joinedRoom.room_id);
      setCurrentPlayerId(joinedRoom.player_id);
      setSessionToken(joinedRoom.session_token);
      saveRoomSession({
        roomId: joinedRoom.room_id,
        playerId: joinedRoom.player_id,
        sessionToken: joinedRoom.session_token,
      });

      const socket = new GameSocket({
        onOpen: () => {
          setReconnect('connected');
        },
        onMessage: (message: WsInboundMessage) => {
          if (message.type !== 'ROOM_STATE_UPDATE') return;
          if (!isObject(message.payload)) {
            console.error('[Create Room] Received ROOM_STATE_UPDATE with a non-object payload.');
            closeActiveSocket();
            setConnecting(false);
            setReconnect('offline');
            setErrorKind('generic');
            return;
          }

          const update = message as RoomStateUpdateMessage;
          setRoom(adaptRoomState(update.payload as BackendRoomState));
          setScreen('lobby');
          setConnecting(false);
          setReconnect('connected');
        },
        onClose: (code, reason) => {
          if (isLeavingRef.current) return;
          console.error('[Create Room] Room WebSocket closed unexpectedly.', { code, reason });
          socketRef.current = null;
          setConnecting(false);
          setReconnect('offline');
          setErrorKind('generic');
        },
        onError: () => {
          if (isLeavingRef.current) return;
          console.error('[Create Room] Room WebSocket encountered an error.');
          closeActiveSocket();
          setConnecting(false);
          setReconnect('offline');
          setErrorKind('generic');
        },
      });

      closeActiveSocket();
      socketRef.current = socket;
      setReconnect('reconnecting');
      socket.connect(joinedRoom.room_id, joinedRoom.session_token);
    } catch (error) {
      console.error('[Create Room] Failed to create, join, or connect to the room.', getSafeErrorDetails(error));
      clearRuntimeConnection();
      setCurrentPlayerId(ME_ID);
      setConnecting(false);
      setReconnect('offline');
      setErrorKind('generic');
    }
  };

  const handleJoin = async (input: { code: string; name: string }) => {
    setConnecting(true);
    setErrorKind(null);
    const normalizedRoomId = normalizeRoomCode(input.code);

    if (normalizedRoomId.length !== ROOM_CODE_LENGTH) {
      setConnecting(false);
      setErrorKind('room-not-found');
      return;
    }

    try {
      const playerId = crypto.randomUUID();
      const joinedRoom = await joinRoom(normalizedRoomId, {
        player_id: playerId,
        display_name: input.name,
      });

      setRoomId(joinedRoom.room_id);
      setCurrentPlayerId(joinedRoom.player_id);
      setSessionToken(joinedRoom.session_token);
      saveRoomSession({
        roomId: joinedRoom.room_id,
        playerId: joinedRoom.player_id,
        sessionToken: joinedRoom.session_token,
      });

      const socket = new GameSocket({
        onOpen: () => setReconnect('connected'),
        onMessage: (message: WsInboundMessage) => {
          if (message.type !== 'ROOM_STATE_UPDATE') return;
          if (!isBackendRoomState(message.payload)) {
            console.error('[Join Room] Received an invalid ROOM_STATE_UPDATE payload.');
            closeActiveSocket();
            setConnecting(false);
            setReconnect('offline');
            setErrorKind('generic');
            return;
          }

          setRoom(adaptRoomState(message.payload));
          setScreen('lobby');
          setConnecting(false);
          setReconnect('connected');
        },
        onClose: (code, reason) => {
          if (isLeavingRef.current) return;
          console.error('[Join Room] Room WebSocket closed unexpectedly.', { code, reason });
          socketRef.current = null;
          setConnecting(false);
          setReconnect('offline');
          setErrorKind('disconnected');
        },
        onError: () => {
          if (isLeavingRef.current) return;
          console.error('[Join Room] Room WebSocket encountered an error.');
          closeActiveSocket();
          setConnecting(false);
          setReconnect('offline');
          setErrorKind('disconnected');
        },
      });

      closeActiveSocket();
      socketRef.current = socket;
      setReconnect('reconnecting');
      socket.connect(joinedRoom.room_id, joinedRoom.session_token);
    } catch (error) {
      console.error('[Join Room] Failed to join or connect to the room.', getSafeErrorDetails(error));
      clearRuntimeConnection();
      setCurrentPlayerId(ME_ID);
      setConnecting(false);
      setReconnect('offline');
      setErrorKind(mapJoinError(error));
    }
  };
  const handleStart = () => {
    setScreen('host-setup');
  };

  const handleDeal = (setup: { firstPlayerId: string; trumpHiderId?: string }) => {
    if (room.config.trumpMode === 'hidden' && setup.trumpHiderId === ME_ID) {
      setScreen('hidden-trump');
    } else {
      setTrump(mockTrump);
      setTrick({ leadSuit: null, cards: [], currentPlayerId: setup.firstPlayerId });
      setTrickNumber(1);
      setScreen('game');
    }
  };

  const handleHideTrump = () => {
    setTrump(mockTrump);
    setScreen('game');
    pushToast({ kind: 'success', title: 'Trump hidden', description: 'The trump suit has been set secretly.' });
  };

  const handlePlayCard = (card: Card) => {
    pushToast({ kind: 'info', title: 'Card played', description: `${card.rank} of ${card.suit}.` });
    const order = room.players;
    const idx = order.findIndex((p) => p.id === trick.currentPlayerId);
    const next = order[(idx + 1) % order.length];
    setTrick((t) => ({
      ...t,
      cards: [...t.cards, { playerId: trick.currentPlayerId, card }],
      currentPlayerId: next.id,
    }));
  };

  const handleRematch = () => {
    setScreen('lobby');
  };

  const handleEndGame = () => {
    setWinningTeam('A');
    setScreen('game-end');
  };

  if (connecting) return <ConnectingScreen />;
  if (errorKind) return <ErrorScreen kind={errorKind} onHome={goHome} onRetry={errorKind === 'disconnected' ? goHome : undefined} />;

  return (
    <>
      <ReconnectBanner state={reconnect} />
      <div className={reconnect !== 'connected' ? 'pt-10' : ''}>
        {screen === 'landing' && (
          <LandingPage onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} />
        )}

        {screen === 'create' && (
          <CreateRoomPage onBack={goHome} onCreate={handleCreate} />
        )}

        {screen === 'join' && <JoinRoomPage onBack={goHome} onJoin={handleJoin} />}

        {screen === 'lobby' && (
          <LobbyPage room={room} meId={currentPlayerId} onStart={handleStart} onLeave={handleLeave} />
        )}

        {screen === 'host-setup' && (
          <HostSetupPage room={room} meId={ME_ID} onDeal={handleDeal} onCancel={() => setScreen('lobby')} />
        )}

        {screen === 'hidden-trump' && (
          <HiddenTrumpPage
            isHider={room.config.trumpMode === 'hidden'}
            hiderName="You"
            hand={mockHand}
            onConfirm={handleHideTrump}
          />
        )}

        {screen === 'game' && (
          <GameTablePage
            room={room}
            meId={ME_ID}
            hand={mockHand}
            playableIds={mockPlayableIds}
            trick={trick}
            trump={trump}
            scores={scores}
            trickNumber={trickNumber}
            totalTricks={13}
            onPlayCard={handlePlayCard}
            onLeave={handleLeave}
            onEndGame={handleEndGame}
          />
        )}

        {screen === 'game-end' && (
          <GameEndPage
            winningTeam={winningTeam}
            scores={scores}
            players={room.players}
            meId={ME_ID}
            onRematch={handleRematch}
            onLeave={handleLeave}
          />
        )}
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default App;



