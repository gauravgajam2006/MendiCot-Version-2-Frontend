import { useCallback, useEffect, useRef, useState } from 'react';
import { LandingPage } from '@/screens/LandingPage';
import { CreateRoomPage } from '@/screens/CreateRoomPage';
import { JoinRoomPage } from '@/screens/JoinRoomPage';
import { ResumeSessionPage, SessionRestoreNotice, SessionValidationUnavailablePage } from '@/screens/ResumeSessionPage';
import type { ResumeSessionChoice, SessionRestoreNoticeKind } from '@/screens/ResumeSessionPage';
import { LobbyPage } from '@/screens/LobbyPage';
import { HostSetupPage } from '@/screens/HostSetupPage';
import { HiddenTrumpPage } from '@/screens/HiddenTrumpPage';
import { GameTablePage } from '@/screens/GameTablePage';
import { GameEndPage } from '@/screens/GameEndPage';
import { ErrorScreen, ConnectingScreen } from '@/screens/ErrorScreens';
import { ReconnectBanner } from '@/components/ui/ReconnectBanner';
import { ToastStack } from '@/components/ui/Toast';
import { adaptRoomState, ApiError, createRoom, GameSocket, joinRoom, validateBeforeOpeningSocket, validateRoomSession } from '@/api';
import type { BackendRoomState, SessionValidationRejectionCode, ValidateSessionResponse, WsInboundMessage } from '@/api';
import { normalizeRoomCode, ROOM_CODE_LENGTH } from '@/utils/roomCode';
import { classifyJoinError } from '@/utils/joinError';
import type { JoinErrorKind } from '@/utils/joinError';
import {
  claimTabSession,
  clearActiveTabSession,
  finalizeRejectedRoomSession,
  finalizeValidatedRejectedRoomSession,
  getActiveTabSession,
  getAllRoomSessions,
  getRoomSession,
  getSessionStartupDecision,
  releaseTabSession,
  removeRoomSession,
  saveRoomSession,
  setActiveTabSession,
  updateRoomSessionIdentity,
} from '@/utils/roomSession';
import type { RoomSession } from '@/utils/roomSession';
import { classifySessionClose, isCurrentSessionSocket, isExplicitSessionRejectionMessage } from '@/utils/sessionRejection';
import { INITIAL_RESTORATION_STATE, isRestorationNoticeState, restorationStateForCode, restorationStateForStartup } from '@/utils/restorationState';
import type { RestorationState } from '@/utils/restorationState';
import type { ToastMessage } from '@/types';
import { ME_ID, generatePlayers, mockHand, mockPlayableIds, mockScores, mockTrick, mockTrump } from '@/mockData';
import type { Card, GameScreen, PlayerCount, ReconnectState, RoomState, TeamId, TrumpMode } from '@/types';

type ErrorKind = JoinErrorKind | 'disconnected';
function noticeForRestorationState(state: RestorationState): SessionRestoreNoticeKind | null {
  return isRestorationNoticeState(state) ? state : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getSafeErrorDetails(error: unknown): Record<string, string | number> {
  if (error instanceof ApiError) return { kind: 'api', status: error.status, statusText: error.statusText };
  if (error instanceof Error) return { kind: 'error', name: error.name };
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

function createInitialRoomState(): RoomState {
  return {
    config: { code: 'DEMO1234', playerCount: 4, trumpMode: 'normal' },
    players: generatePlayers(4),
    hostId: ME_ID,
    teams: { A: 'Team Maroon', B: 'Team Gold' },
  };
}

function savedSessionChoices(): ResumeSessionChoice[] {
  return Object.entries(getAllRoomSessions())
    .map(([sessionKey, session]) => ({ sessionKey, session }))
    .sort((a, b) => b.session.updatedAt - a.session.updatedAt);
}

function App() {
  const [screen, setScreen] = useState<GameScreen>('landing');
  const [connecting, setConnecting] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [reconnect, setReconnect] = useState<ReconnectState>('connected');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [resumeSessions, setResumeSessions] = useState<ResumeSessionChoice[]>([]);
  const [blockedSessionKey, setBlockedSessionKey] = useState<string | null>(null);
  const [restorationState, setRestorationState] = useState<RestorationState>(INITIAL_RESTORATION_STATE);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(ME_ID);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [activeSessionKey, setActiveSessionKey] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState>(createInitialRoomState);
  const [trump, setTrump] = useState(mockTrump);
  const [trick, setTrick] = useState(mockTrick);
  const [scores] = useState(mockScores);
  const [winningTeam, setWinningTeam] = useState<TeamId>('A');
  const [trickNumber, setTrickNumber] = useState(5);

  const socketRef = useRef<GameSocket | null>(null);
  const isLeavingRef = useRef(false);
  const connectionGenerationRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const activeSessionKeyRef = useRef<string | null>(null);
  const currentPlayerIdRef = useRef(ME_ID);
  const tabIdRef = useRef(crypto.randomUUID());
  const connectSessionRef = useRef<((sessionKey: string, session: RoomSession) => void) | null>(null);
  const validationAttemptRef = useRef(0);
  const validationAbortRef = useRef<AbortController | null>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResumeRef = useRef<{ choice: ResumeSessionChoice; takeOver: boolean } | null>(null);

  const cancelSessionValidation = useCallback(() => {
    validationAttemptRef.current += 1;
    validationAbortRef.current?.abort();
    validationAbortRef.current = null;
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
  }, []);

  const closeActiveSocket = useCallback(() => {
    connectionGenerationRef.current += 1;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
  }, []);

  const resetRuntimeConnection = useCallback(() => {
    cancelSessionValidation();
    closeActiveSocket();
    activeSessionKeyRef.current = null;
    currentPlayerIdRef.current = ME_ID;
    setActiveSessionKey(null);
    setRoomId(null);
    setCurrentPlayerId(ME_ID);
    setSessionToken(null);
    setRoom(createInitialRoomState());
    setTrump(mockTrump);
    setTrick(mockTrick);
    setTrickNumber(5);
    setWinningTeam('A');
    setReconnect('connected');
  }, [cancelSessionValidation, closeActiveSocket]);

  const showAvailableSessions = useCallback((blockedKey: string | null = null) => {
    const sessions = savedSessionChoices();
    setResumeSessions(sessions);
    setBlockedSessionKey(blockedKey);
    setScreen(sessions.length > 0 ? 'resume' : 'landing');
    setRestorationState(sessions.length > 0 ? 'resume-selection' : 'idle');
    setConnecting(false);
    setErrorKind(null);
  }, []);

  const finishExpiredSession = useCallback((sessionKey: string) => {
    const cleanup = finalizeRejectedRoomSession(sessionKey, tabIdRef.current);
    resetRuntimeConnection();
    if (!cleanup.removed) {
      showAvailableSessions(sessionKey);
      return;
    }

    const sessions = Object.entries(cleanup.remainingSessions)
      .map(([remainingKey, session]) => ({ sessionKey: remainingKey, session }))
      .sort((a, b) => b.session.updatedAt - a.session.updatedAt);
    setResumeSessions(sessions);
    setBlockedSessionKey(null);
    setRestorationState('session-expired');
    setScreen(cleanup.destination);
    setConnecting(false);
    setErrorKind(null);
  }, [resetRuntimeConnection, showAvailableSessions]);

  const connectRoomSession = useCallback((sessionKey: string, session: RoomSession) => {
    if (!claimTabSession(sessionKey, tabIdRef.current)) {
      clearActiveTabSession(sessionKey);
      resetRuntimeConnection();
      showAvailableSessions(sessionKey);
      return;
    }
    closeActiveSocket();
    const generation = connectionGenerationRef.current;
    const publicRoomId = normalizeRoomCode(session.roomId);
    let receivedRoomState = false;
    let terminalStateReached = false;

    activeSessionKeyRef.current = sessionKey;
    currentPlayerIdRef.current = session.playerId;
    setActiveSessionKey(sessionKey);
    setRoomId(publicRoomId);
    setCurrentPlayerId(session.playerId);
    setSessionToken(session.sessionToken);
    setConnecting(true);
    setErrorKind(null);
    setReconnect('reconnecting');

    const expectedIdentity = { generation, sessionKey, playerId: session.playerId };
    const isCurrentGeneration = (socket: GameSocket) => socketRef.current === socket
      && isCurrentSessionSocket(expectedIdentity, {
        generation: connectionGenerationRef.current,
        sessionKey: activeSessionKeyRef.current,
        playerId: currentPlayerIdRef.current,
      });
    const rejectCurrentSession = (socket: GameSocket) => {
      if (terminalStateReached || !isCurrentGeneration(socket)) return;
      terminalStateReached = true;
      finishExpiredSession(sessionKey);
    };

    const socket = new GameSocket({
      onOpen: () => {
        if (!isCurrentGeneration(socket)) return;
      },
      onMessage: (message: WsInboundMessage) => {
        if (!isCurrentGeneration(socket)) return;
        if (!receivedRoomState && isExplicitSessionRejectionMessage(message)) {
          console.warn('[Room Session] The server explicitly rejected this saved session.');
          rejectCurrentSession(socket);
          return;
        }
        if (message.type !== 'ROOM_STATE_UPDATE') return;
        if (!isBackendRoomState(message.payload)) {
          console.error('[Room Session] Received an invalid ROOM_STATE_UPDATE payload.');
          closeActiveSocket();
          setRestorationState('idle');
          setConnecting(false);
          setReconnect('offline');
          setErrorKind('generic');
          return;
        }

        const currentPlayer = message.payload.players.find((player) => player.player_id === session.playerId);
        if (!currentPlayer) {
          console.warn('[Room Session] The saved player no longer exists in the room.');
          rejectCurrentSession(socket);
          return;
        }

        receivedRoomState = true;
        reconnectAttemptsRef.current = 0;
        saveRoomSession({
          roomId: publicRoomId,
          playerId: session.playerId,
          sessionToken: session.sessionToken,
          displayName: currentPlayer.display_name,
        });
        setRoom(adaptRoomState(message.payload, session.playerId));
        pendingResumeRef.current = null;
        setScreen('lobby');
        setRestorationState('idle');
        setConnecting(false);
        setReconnect('connected');
      },
      onClose: (code, reason) => {
        if (!isCurrentGeneration(socket) || isLeavingRef.current) return;
        if (classifySessionClose(code, reason) === 'expire-session') {
          console.warn('[Room Session] The server rejected this saved session.', { code, reason });
          rejectCurrentSession(socket);
          return;
        }

        socketRef.current = null;
        console.warn('[Room Session] Socket closed; retrying the same saved identity.', { code, reason, receivedRoomState });
        setConnecting(false);
        setErrorKind(null);
        if (reconnectAttemptsRef.current >= 3) {
          setRestorationState('idle');
          setReconnect('offline');
          setErrorKind('disconnected');
          return;
        }
        reconnectAttemptsRef.current += 1;
        setReconnect('reconnecting');
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (activeSessionKeyRef.current !== sessionKey) return;
          const currentSession = getRoomSession(sessionKey);
          if (currentSession) connectSessionRef.current?.(sessionKey, currentSession);
          else {
            resetRuntimeConnection();
            showAvailableSessions();
          }
        }, 500 * reconnectAttemptsRef.current);
      },
      onError: () => {
        if (!isCurrentGeneration(socket) || isLeavingRef.current) return;
        console.error('[Room Session] Room WebSocket encountered an error.');
      },
    });

    socketRef.current = socket;
    socket.connect(publicRoomId, session.sessionToken);
  }, [closeActiveSocket, finishExpiredSession, resetRuntimeConnection, showAvailableSessions]);
  connectSessionRef.current = connectRoomSession;

  const openValidatedSession = useCallback((
    choice: ResumeSessionChoice,
    takeOver: boolean,
    validated: ValidateSessionResponse,
  ) => {
    const canonical = updateRoomSessionIdentity(choice.sessionKey, {
      roomId: validated.roomId,
      displayName: validated.displayName,
    });
    if (!canonical) {
      setRestorationState('backend-unavailable');
      setConnecting(false);
      return;
    }
    const canonicalKey = canonical.sessionKey;
    if (canonicalKey !== choice.sessionKey) {
      clearActiveTabSession(choice.sessionKey);
      releaseTabSession(choice.sessionKey, tabIdRef.current);
    }

    if (!claimTabSession(canonicalKey, tabIdRef.current, takeOver)) {
      pendingResumeRef.current = null;
      clearActiveTabSession(canonicalKey);
      showAvailableSessions(canonicalKey);
      return;
    }

    const previousKey = activeSessionKeyRef.current;
    if (previousKey && previousKey !== canonicalKey) releaseTabSession(previousKey, tabIdRef.current);
    setActiveTabSession(canonicalKey);
    setBlockedSessionKey(null);
    setRestorationState('restoring-session');
    reconnectAttemptsRef.current = 0;
    connectRoomSession(canonicalKey, canonical.session);
  }, [connectRoomSession, showAvailableSessions]);

  const finishValidatedRejection = useCallback((sessionKey: string, code: SessionValidationRejectionCode) => {
    const cleanup = finalizeValidatedRejectedRoomSession(sessionKey);
    pendingResumeRef.current = null;
    resetRuntimeConnection();
    const sessions = Object.entries(cleanup.remainingSessions)
      .map(([remainingKey, session]) => ({ sessionKey: remainingKey, session }))
      .sort((a, b) => b.session.updatedAt - a.session.updatedAt);
    setResumeSessions(sessions);
    setBlockedSessionKey(null);
    setScreen(cleanup.destination);
    setRestorationState(restorationStateForCode(code));
    setConnecting(false);
    setErrorKind(null);
  }, [resetRuntimeConnection]);

  const validateAndRestore = useCallback(async (choice: ResumeSessionChoice, takeOver = false) => {
    pendingResumeRef.current = { choice, takeOver };
    cancelSessionValidation();
    closeActiveSocket();
    const attempt = validationAttemptRef.current;
    const controller = new AbortController();
    validationAbortRef.current = controller;
    validationTimeoutRef.current = setTimeout(() => controller.abort(), 7_000);
    setRestorationState('validating-session');
    setConnecting(false);
    setErrorKind(null);

    const result = await validateBeforeOpeningSocket(
      () => validateRoomSession(choice.session.roomId, choice.session.playerId, choice.session.sessionToken, controller.signal),
      (validated) => {
        if (validationAttemptRef.current === attempt) openValidatedSession(choice, takeOver, validated);
      },
    );
    if (validationAttemptRef.current !== attempt) return;
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    validationTimeoutRef.current = null;
    validationAbortRef.current = null;

    if (result.kind === 'rejected') {
      finishValidatedRejection(choice.sessionKey, result.code);
      return;
    }
    if (result.kind === 'unavailable') {
      setRestorationState('backend-unavailable');
      setConnecting(false);
    }
  }, [cancelSessionValidation, closeActiveSocket, finishValidatedRejection, openValidatedSession]);

  useEffect(() => {
    const tabId = tabIdRef.current;
    const decision = getSessionStartupDecision();
    if (decision.kind === 'resume') void validateAndRestore(decision);
    else if (decision.kind === 'choose') {
      setResumeSessions(decision.sessions);
      setScreen('resume');
      setRestorationState(restorationStateForStartup(decision.kind));
      setConnecting(false);
    } else {
      setScreen('landing');
      setRestorationState(restorationStateForStartup(decision.kind));
      setConnecting(false);
    }

    return () => {
      const sessionKey = activeSessionKeyRef.current;
      cancelSessionValidation();
      closeActiveSocket();
      if (sessionKey) releaseTabSession(sessionKey, tabId);
    };
  }, [cancelSessionValidation, closeActiveSocket, validateAndRestore]);

  useEffect(() => {
    if (!activeSessionKey) return;
    const tabId = tabIdRef.current;
    const refreshClaim = () => {
      if (claimTabSession(activeSessionKey, tabId)) return;
      clearActiveTabSession(activeSessionKey);
      resetRuntimeConnection();
      showAvailableSessions(activeSessionKey);
    };
    const releaseClaim = () => releaseTabSession(activeSessionKey, tabId);
    const interval = setInterval(refreshClaim, 2_000);
    window.addEventListener('beforeunload', releaseClaim);
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', releaseClaim);
    };
  }, [activeSessionKey, resetRuntimeConnection, showAvailableSessions]);

  useEffect(() => {
    const notice = noticeForRestorationState(restorationState);
    if (!notice) return;
    const timeout = setTimeout(() => {
      setRestorationState(screen === 'resume' ? 'resume-selection' : 'idle');
    }, 6_000);
    return () => clearTimeout(timeout);
  }, [restorationState, screen]);

  const pushToast = useCallback((t: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const handleValidationRetry = () => {
    const pending = pendingResumeRef.current;
    if (pending) void validateAndRestore(pending.choice, pending.takeOver);
  };

  const handleValidationBack = () => {
    const pending = pendingResumeRef.current;
    pendingResumeRef.current = null;
    if (pending) {
      clearActiveTabSession(pending.choice.sessionKey);
      releaseTabSession(pending.choice.sessionKey, tabIdRef.current);
    }
    resetRuntimeConnection();
    showAvailableSessions();
  };

  const goHome = () => {
    pendingResumeRef.current = null;
    const sessionKey = activeSessionKeyRef.current ?? getActiveTabSession();
    if (sessionKey) {
      releaseTabSession(sessionKey, tabIdRef.current);
      clearActiveTabSession(sessionKey);
    }
    resetRuntimeConnection();
    setScreen('landing');
    setRestorationState('idle');
    setErrorKind(null);
    setConnecting(false);
  };

  const handleForget = (sessionKey: string) => {
    releaseTabSession(sessionKey, tabIdRef.current);
    removeRoomSession(sessionKey);
    clearActiveTabSession(sessionKey);
    showAvailableSessions();
  };

  const handleLeave = async () => {
    if (isLeavingRef.current) return;
    const socket = socketRef.current;
    const sessionKey = activeSessionKeyRef.current;
    const stillOwnsSession = sessionKey !== null && claimTabSession(sessionKey, tabIdRef.current);
    isLeavingRef.current = true;
    try {
      if (stillOwnsSession && roomId !== null && sessionToken !== null && socket !== null) {
        const result = await socket.leaveRoom();
        if (result !== 'acknowledged') console.warn('[Leave Room] Backend leave was not acknowledged.', { result });
      }
    } finally {
      if (sessionKey && stillOwnsSession) {
        releaseTabSession(sessionKey, tabIdRef.current);
        removeRoomSession(sessionKey);
      }
      if (sessionKey) clearActiveTabSession(sessionKey);
      resetRuntimeConnection();
      setScreen('landing');
      setErrorKind(null);
      setConnecting(false);
      isLeavingRef.current = false;
    }
  };

  const startNewSession = (session: Omit<RoomSession, 'updatedAt'>) => {
    const sessionKey = saveRoomSession(session);
    if (!sessionKey) throw new Error('The room session could not be saved.');
    if (!claimTabSession(sessionKey, tabIdRef.current)) throw new Error('The room session is active in another tab.');
    const savedSession = getRoomSession(sessionKey);
    if (!savedSession) throw new Error('The room session could not be loaded.');
    setActiveTabSession(sessionKey);
    setRestorationState('idle');
    reconnectAttemptsRef.current = 0;
    connectRoomSession(sessionKey, savedSession);
  };

  const handleCreate = async (cfg: { name: string; playerCount: PlayerCount; trumpMode: TrumpMode }) => {
    setRestorationState('idle');
    setConnecting(true);
    setErrorKind(null);
    try {
      const createdRoom = await createRoom({ player_count: cfg.playerCount, trump_mode: cfg.trumpMode });
      const joinedRoom = await joinRoom(createdRoom.room_id, { player_id: crypto.randomUUID(), display_name: cfg.name });
      startNewSession({
        roomId: normalizeRoomCode(joinedRoom.room_id),
        playerId: joinedRoom.player_id,
        sessionToken: joinedRoom.session_token,
        displayName: cfg.name,
      });
    } catch (error) {
      console.error('[Create Room] Failed to create or join the room.', getSafeErrorDetails(error));
      resetRuntimeConnection();
      setConnecting(false);
      setReconnect('offline');
      setErrorKind('generic');
    }
  };

  const handleJoin = async (input: { code: string; name: string }) => {
    setRestorationState('idle');
    setConnecting(true);
    setErrorKind(null);
    const normalizedRoomId = normalizeRoomCode(input.code);
    if (normalizedRoomId.length !== ROOM_CODE_LENGTH) {
      setConnecting(false);
      setErrorKind('room-not-found');
      return;
    }
    try {
      const joinedRoom = await joinRoom(normalizedRoomId, { player_id: crypto.randomUUID(), display_name: input.name });
      startNewSession({
        roomId: normalizeRoomCode(joinedRoom.room_id),
        playerId: joinedRoom.player_id,
        sessionToken: joinedRoom.session_token,
        displayName: input.name,
      });
    } catch (error) {
      console.error('[Join Room] Failed to join the room.', getSafeErrorDetails(error));
      resetRuntimeConnection();
      setConnecting(false);
      setReconnect('offline');
      setErrorKind(error instanceof ApiError ? classifyJoinError(error.status, error.body) : 'generic');
    }
  };

  const handleDeal = (setup: { firstPlayerId: string; trumpHiderId?: string }) => {
    if (room.config.trumpMode === 'hidden' && setup.trumpHiderId === currentPlayerId) setScreen('hidden-trump');
    else {
      setTrump(mockTrump);
      setTrick({ leadSuit: null, cards: [], currentPlayerId: setup.firstPlayerId });
      setTrickNumber(1);
      setScreen('game');
    }
  };

  const handlePlayCard = (card: Card) => {
    pushToast({ kind: 'info', title: 'Card played', description: `${card.rank} of ${card.suit}.` });
    const idx = room.players.findIndex((p) => p.id === trick.currentPlayerId);
    const next = room.players[(idx + 1) % room.players.length];
    setTrick((value) => ({ ...value, cards: [...value.cards, { playerId: value.currentPlayerId, card }], currentPlayerId: next.id }));
  };

  const restorationNotice = noticeForRestorationState(restorationState);
  if (restorationState === 'validating-session') return <ConnectingScreen label="Checking saved session" />;
  if (restorationState === 'restoring-session') return <ConnectingScreen label="Restoring saved session" />;
  if (restorationState === 'backend-unavailable') {
    return <SessionValidationUnavailablePage onRetry={handleValidationRetry} onBack={handleValidationBack} />;
  }
  if (connecting) return <ConnectingScreen />;
  if (errorKind) return <ErrorScreen kind={errorKind} onHome={goHome} onRetry={errorKind === 'disconnected' ? goHome : undefined} />;
  if (screen === 'resume') {
    return <ResumeSessionPage sessions={resumeSessions} blockedSessionKey={blockedSessionKey} notice={restorationNotice} onResume={(choice, takeOver) => void validateAndRestore(choice, takeOver)} onForget={handleForget} onCancel={goHome} />;
  }

  return (
    <>
      {restorationNotice && <SessionRestoreNotice kind={restorationNotice} floating />}
      <ReconnectBanner state={reconnect} />
      <div className={reconnect !== 'connected' ? 'pt-10' : ''}>
        {screen === 'landing' && <LandingPage onCreate={() => { setRestorationState('idle'); setScreen('create'); }} onJoin={() => { setRestorationState('idle'); setScreen('join'); }} />}
        {screen === 'create' && <CreateRoomPage onBack={goHome} onCreate={handleCreate} />}
        {screen === 'join' && <JoinRoomPage onBack={goHome} onJoin={handleJoin} />}
        {screen === 'lobby' && <LobbyPage room={room} meId={currentPlayerId} onStart={() => setScreen('host-setup')} onLeave={handleLeave} />}
        {screen === 'host-setup' && <HostSetupPage room={room} meId={currentPlayerId} onDeal={handleDeal} onCancel={() => setScreen('lobby')} />}
        {screen === 'hidden-trump' && <HiddenTrumpPage isHider={room.config.trumpMode === 'hidden'} hiderName="You" hand={mockHand} onConfirm={() => { setTrump(mockTrump); setScreen('game'); }} />}
        {screen === 'game' && <GameTablePage room={room} meId={currentPlayerId} hand={mockHand} playableIds={mockPlayableIds} trick={trick} trump={trump} scores={scores} trickNumber={trickNumber} totalTricks={13} onPlayCard={handlePlayCard} onLeave={handleLeave} onEndGame={() => { setWinningTeam('A'); setScreen('game-end'); }} />}
        {screen === 'game-end' && <GameEndPage winningTeam={winningTeam} scores={scores} players={room.players} meId={currentPlayerId} onRematch={() => setScreen('lobby')} onLeave={handleLeave} />}
      </div>
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
    </>
  );
}

export default App;
