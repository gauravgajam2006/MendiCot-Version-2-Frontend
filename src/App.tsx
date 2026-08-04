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
import { adaptGameState, adaptRoomState, ApiError, canSubmitCard, createPlayCardRequest, createRoom, derivePlayableIds, GameSocket, isBackendGameState, joinRoom, resolveGameplayActionError, validateBeforeOpeningSocket, validateRoomSession } from '@/api';
import type { AuthoritativeGameState, BackendGamePhase, BackendRoomState, BackendTeamId, SessionValidationRejectionCode, ValidateSessionResponse, WsInboundMessage } from '@/api';
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
import { createTeamSwitchRequest, getLobbyStartState, isTeamSwitchConfirmed, resolveLobbyActionError } from '@/utils/lobbyState';
import { authoritativeTeamNames, createTeamRenameRequest, isBackendTeamNames, isTeamRenameConfirmed, resolveTeamRenameError } from '@/utils/teamNames';
import {
  createCancelGameSetupRequest,
  createFirstPlayerSelectionRequest,
  resolveSetupActionError,
  screenForAuthoritativeState,
  shouldAcceptGamePhase,
} from '@/utils/setupLifecycle';
import type { Card, GameScreen, PlayerCount, ReconnectState, RoomState, TeamId, TrumpMode } from '@/types';

const NO_PLAYER_ID = '';

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
    && (value.status === 'WAITING' || value.status === 'GAME_SETUP' || value.status === 'IN_GAME')
    && (value.host_id === null || typeof value.host_id === 'string')
    && (value.player_count === 4 || value.player_count === 6 || value.player_count === 8)
    && (value.trump_mode === 'normal' || value.trump_mode === 'hidden')
    && Array.isArray(value.players)
    && isBackendTeamNames(value.team_names)
    && value.players.every((player) => isObject(player)
      && typeof player.player_id === 'string'
      && typeof player.display_name === 'string'
      && (player.team_id === 'TeamA' || player.team_id === 'TeamB')
      && Number.isInteger(player.seat_index)
      && (player.seat_index as number) >= 0
      && typeof player.is_online === 'boolean');
}

function createInitialRoomState(): RoomState {
  return {
    status: 'WAITING',
    config: { code: '', playerCount: 4, trumpMode: 'normal' },
    players: [],
    hostId: '',
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
  const [resumeSessions, setResumeSessions] = useState<ResumeSessionChoice[]>([]);
  const [blockedSessionKey, setBlockedSessionKey] = useState<string | null>(null);
  const [restorationState, setRestorationState] = useState<RestorationState>(INITIAL_RESTORATION_STATE);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState(NO_PLAYER_ID);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [activeSessionKey, setActiveSessionKey] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState>(createInitialRoomState);
  const [pendingTeamSwitch, setPendingTeamSwitch] = useState<BackendTeamId | null>(null);
  const [pendingTeamRename, setPendingTeamRename] = useState<string | null>(null);
  const [teamRenameMessage, setTeamRenameMessage] = useState<string | null>(null);
  const [startPending, setStartPending] = useState(false);
  const [cancelSetupPending, setCancelSetupPending] = useState(false);
  const [firstPlayerPending, setFirstPlayerPending] = useState(false);
  const [setupPhase, setSetupPhase] = useState<BackendGamePhase | null>(null);
  const [lobbyActionMessage, setLobbyActionMessage] = useState<string | null>(null);
  const [gameState, setGameState] = useState<AuthoritativeGameState | null>(null);
  const [gameplayPending, setGameplayPending] = useState(false);
  const [gameplayMessage, setGameplayMessage] = useState<string | null>(null);

  const socketRef = useRef<GameSocket | null>(null);
  const isLeavingRef = useRef(false);
  const connectionGenerationRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const activeSessionKeyRef = useRef<string | null>(null);
  const currentPlayerIdRef = useRef(NO_PLAYER_ID);
  const roomRef = useRef(room);
  const gameStateRef = useRef<AuthoritativeGameState | null>(null);
  const gameplayPendingVersionRef = useRef<number | null>(null);
  const tabIdRef = useRef(crypto.randomUUID());
  const connectSessionRef = useRef<((sessionKey: string, session: RoomSession) => void) | null>(null);
  const validationAttemptRef = useRef(0);
  const validationAbortRef = useRef<AbortController | null>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResumeRef = useRef<{ choice: ResumeSessionChoice; takeOver: boolean } | null>(null);
  const pendingTeamSwitchRef = useRef<BackendTeamId | null>(null);
  const pendingTeamRenameRef = useRef<string | null>(null);
  const startPendingRef = useRef(false);
  const cancelSetupPendingRef = useRef(false);
  const firstPlayerPendingRef = useRef(false);
  const setupPhaseRef = useRef<BackendGamePhase | null>(null);
  const latestGameStateVersionRef = useRef(-1);

  useEffect(() => { roomRef.current = room; }, [room]);

  const cancelSessionValidation = useCallback(() => {
    validationAttemptRef.current += 1;
    validationAbortRef.current?.abort();
    validationAbortRef.current = null;
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
  }, []);

  const clearLobbyPendingActions = useCallback((clearMessage = true) => {
    pendingTeamSwitchRef.current = null;
    pendingTeamRenameRef.current = null;
    startPendingRef.current = false;
    cancelSetupPendingRef.current = false;
    firstPlayerPendingRef.current = false;
    setPendingTeamSwitch(null);
    setPendingTeamRename(null);
    setStartPending(false);
    setCancelSetupPending(false);
    setFirstPlayerPending(false);
    if (clearMessage) setLobbyActionMessage(null);
    if (clearMessage) setTeamRenameMessage(null);
  }, []);

  const closeActiveSocket = useCallback(() => {
    clearLobbyPendingActions();
    connectionGenerationRef.current += 1;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const socket = socketRef.current;
    socketRef.current = null;
    socket?.close();
  }, [clearLobbyPendingActions]);

  const resetRuntimeConnection = useCallback(() => {
    cancelSessionValidation();
    closeActiveSocket();
    activeSessionKeyRef.current = null;
    currentPlayerIdRef.current = NO_PLAYER_ID;
    setActiveSessionKey(null);
    setRoomId(null);
    setCurrentPlayerId(NO_PLAYER_ID);
    setSessionToken(null);
    setRoom(createInitialRoomState());
    setupPhaseRef.current = null;
    latestGameStateVersionRef.current = -1;
    setSetupPhase(null);
    gameStateRef.current = null;
    gameplayPendingVersionRef.current = null;
    setGameState(null);
    setGameplayPending(false);
    setGameplayMessage(null);
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
        if (message.type === 'ERROR') {
          const gameplayError = resolveGameplayActionError(message.payload);
          if (gameplayError) {
            gameplayPendingVersionRef.current = null;
            setGameplayPending(false);
            setGameplayMessage(gameplayError);
            return;
          }
          const teamRenameError = resolveTeamRenameError(message.payload, pendingTeamRenameRef.current);
          if (teamRenameError) {
            pendingTeamRenameRef.current = null;
            setPendingTeamRename(null);
            setTeamRenameMessage(teamRenameError);
            return;
          }
          const actionError = resolveLobbyActionError(
            message.payload,
            pendingTeamSwitchRef.current,
            startPendingRef.current,
          );
          if (actionError?.action === 'switch-team') {
            pendingTeamSwitchRef.current = null;
            setPendingTeamSwitch(null);
            setLobbyActionMessage(actionError.message);
          } else if (actionError?.action === 'start-game') {
            startPendingRef.current = false;
            setStartPending(false);
            setLobbyActionMessage(actionError.message);
          } else {
            const setupError = resolveSetupActionError(
              message.payload,
              cancelSetupPendingRef.current,
              firstPlayerPendingRef.current,
            );
            if (setupError) {
              cancelSetupPendingRef.current = false;
              firstPlayerPendingRef.current = false;
              setCancelSetupPending(false);
              setFirstPlayerPending(false);
              setLobbyActionMessage(setupError);
            }
          }
          return;
        }
        if (message.type === 'GAME_STATE_UPDATE') {
          if (!isBackendGameState(message.payload)) {
            console.warn('[Room Session] Ignoring unsupported GAME_STATE_UPDATE phase.');
            return;
          }
          const gameState = message.payload;
          const version = gameState.version;
          if (version < latestGameStateVersionRef.current) return;
          if (!shouldAcceptGamePhase(setupPhaseRef.current, gameState.phase)) {
            console.warn('[Room Session] Ignoring stale GAME_STATE_UPDATE phase.', {
              currentPhase: setupPhaseRef.current,
              incomingPhase: gameState.phase,
            });
            return;
          }
          latestGameStateVersionRef.current = version;
          const teamNames = authoritativeTeamNames(gameState.team_names, roomRef.current.teams);
          const namedRoom = { ...roomRef.current, teams: teamNames };
          roomRef.current = namedRoom;
          setRoom(namedRoom);
          let adapted: AuthoritativeGameState;
          try {
            adapted = adaptGameState(gameState, namedRoom, session.playerId, gameStateRef.current);
          } catch (error) {
            console.error('[Gameplay] Ignoring an invalid authoritative snapshot.', getSafeErrorDetails(error));
            setGameplayMessage('The latest game state could not be displayed. Waiting for a fresh update.');
            return;
          }
          gameStateRef.current = adapted;
          setGameState(adapted);
          if (gameplayPendingVersionRef.current !== null && version > gameplayPendingVersionRef.current) {
            gameplayPendingVersionRef.current = null;
            setGameplayPending(false);
            setGameplayMessage(null);
          }
          if (gameState.phase === 'CREATED') {
            console.warn('[Room Session] Received transitional CREATED phase; waiting for the next authoritative update.');
            return;
          }
          setupPhaseRef.current = gameState.phase;
          setSetupPhase(gameState.phase);
          if (gameState.phase !== 'FIRST_PLAYER_SELECTION') {
            startPendingRef.current = false;
            setStartPending(false);
            firstPlayerPendingRef.current = false;
            setFirstPlayerPending(false);
          }
          const nextScreen = screenForAuthoritativeState(gameState.room_status, gameState.phase);
          if (nextScreen) setScreen(nextScreen);
          setLobbyActionMessage(null);
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

        const switchConfirmed = isTeamSwitchConfirmed(
          pendingTeamSwitchRef.current,
          currentPlayer.team_id,
        );
        const renameConfirmed = isTeamRenameConfirmed(
          pendingTeamRenameRef.current,
          currentPlayer.team_id === 'TeamA' ? 'A' : 'B',
          message.payload.team_names,
        );
        const authoritativeStatus = message.payload.status;
        const startConfirmed = startPendingRef.current && authoritativeStatus === 'GAME_SETUP';
        const cancelConfirmed = cancelSetupPendingRef.current && authoritativeStatus === 'WAITING';
        const firstPlayerConfirmed = firstPlayerPendingRef.current && authoritativeStatus === 'IN_GAME';
        if (switchConfirmed) {
          pendingTeamSwitchRef.current = null;
          setPendingTeamSwitch(null);
          setLobbyActionMessage(null);
        }
        if (renameConfirmed) {
          pendingTeamRenameRef.current = null;
          setPendingTeamRename(null);
          setTeamRenameMessage(null);
        }
        if (startConfirmed) {
          startPendingRef.current = false;
          setStartPending(false);
          setLobbyActionMessage(null);
        }
        if (cancelConfirmed) {
          cancelSetupPendingRef.current = false;
          setCancelSetupPending(false);
          setupPhaseRef.current = null;
          setSetupPhase(null);
          setLobbyActionMessage(null);
        }
        if (firstPlayerConfirmed) {
          firstPlayerPendingRef.current = false;
          setFirstPlayerPending(false);
          setLobbyActionMessage(null);
        }
        if (authoritativeStatus === 'WAITING') {
          setupPhaseRef.current = null;
          cancelSetupPendingRef.current = false;
          firstPlayerPendingRef.current = false;
          setSetupPhase(null);
          setCancelSetupPending(false);
          setFirstPlayerPending(false);
        }

        receivedRoomState = true;
        reconnectAttemptsRef.current = 0;
        saveRoomSession({
          roomId: publicRoomId,
          playerId: session.playerId,
          sessionToken: session.sessionToken,
          displayName: currentPlayer.display_name,
        });
        const adaptedRoom = adaptRoomState(message.payload, session.playerId, roomRef.current.teams);
        roomRef.current = adaptedRoom;
        setRoom(adaptedRoom);
        if (gameStateRef.current) {
          const renamedGameState: AuthoritativeGameState = {
            ...gameStateRef.current,
            scores: {
              A: { ...gameStateRef.current.scores.A, name: adaptedRoom.teams.A },
              B: { ...gameStateRef.current.scores.B, name: adaptedRoom.teams.B },
            },
          };
          gameStateRef.current = renamedGameState;
          setGameState(renamedGameState);
        }
        pendingResumeRef.current = null;
        const nextScreen = screenForAuthoritativeState(
          authoritativeStatus,
          authoritativeStatus === 'IN_GAME' ? setupPhaseRef.current : null,
        );
        if (nextScreen) setScreen(nextScreen);
        setRestorationState('idle');
        setConnecting(false);
        setReconnect('connected');
      },
      onClose: (code, reason) => {
        if (!isCurrentGeneration(socket) || isLeavingRef.current) return;
        clearLobbyPendingActions();
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
  }, [clearLobbyPendingActions, closeActiveSocket, finishExpiredSession, resetRuntimeConnection, showAvailableSessions]);
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

  const handleSwitchTeam = (targetTeam: TeamId) => {
    const socket = socketRef.current;
    const currentPlayer = room.players.find((player) => player.id === currentPlayerId);
    if (
      startPendingRef.current
      || room.status !== 'WAITING'
      || !currentPlayer
      || currentPlayer.team === targetTeam
    ) return;

    const request = createTeamSwitchRequest(pendingTeamSwitchRef.current, targetTeam);
    if (!request) return;
    if (!socket?.isConnected) {
      setLobbyActionMessage('Could not switch teams. Please try again.');
      return;
    }

    pendingTeamSwitchRef.current = request.pendingTeamId;
    setPendingTeamSwitch(request.pendingTeamId);
    setLobbyActionMessage(null);
    socket.send(request.message);
  };

  const handleRenameTeam = (name: string) => {
    const socket = socketRef.current;
    const currentPlayer = room.players.find((player) => player.id === currentPlayerId);
    if (!currentPlayer || pendingTeamRenameRef.current !== null) return;
    const request = createTeamRenameRequest(pendingTeamRenameRef.current, name);
    if (!request) return;
    if (!socket?.isConnected) {
      setTeamRenameMessage('Could not rename your team. Please try again.');
      return;
    }

    pendingTeamRenameRef.current = name;
    setPendingTeamRename(name);
    setTeamRenameMessage(null);
    socket.send(request);
  };

  const handleStartGame = () => {
    const socket = socketRef.current;
    const startState = getLobbyStartState(room, currentPlayerId);
    if (!startState.canStart) {
      setLobbyActionMessage(startState.reason);
      return;
    }
    if (pendingTeamSwitchRef.current !== null || startPendingRef.current) return;
    if (!socket?.isConnected) {
      setLobbyActionMessage('Could not start the game. Please try again.');
      return;
    }

    startPendingRef.current = true;
    setStartPending(true);
    setLobbyActionMessage(null);
    socket.send({ action: 'START_GAME', payload: {} });
  };

  const handleCancelGameSetup = () => {
    const socket = socketRef.current;
    if (
      room.status !== 'GAME_SETUP'
      || room.hostId !== currentPlayerId
      || cancelSetupPendingRef.current
    ) return;
    const request = createCancelGameSetupRequest(cancelSetupPendingRef.current);
    if (!request) return;
    if (!socket?.isConnected) {
      setLobbyActionMessage('Could not cancel game setup. Please try again.');
      return;
    }

    cancelSetupPendingRef.current = true;
    setCancelSetupPending(true);
    setLobbyActionMessage(null);
    socket.send(request);
  };

  const handleSelectFirstPlayer = (playerId: string) => {
    const socket = socketRef.current;
    if (
      room.status !== 'GAME_SETUP'
      || setupPhaseRef.current !== 'FIRST_PLAYER_SELECTION'
      || room.hostId !== currentPlayerId
      || firstPlayerPendingRef.current
    ) return;
    const request = createFirstPlayerSelectionRequest(firstPlayerPendingRef.current, playerId);
    if (!request) return;
    if (!socket?.isConnected) {
      setLobbyActionMessage('Could not select the first player. Please try again.');
      return;
    }

    firstPlayerPendingRef.current = true;
    setFirstPlayerPending(true);
    setLobbyActionMessage(null);
    socket.send(request);
  };

  const handlePlayCard = (card: Card) => {
    const socket = socketRef.current;
    const state = gameStateRef.current;
    if (!socket?.isConnected || !state || !canSubmitCard(state, currentPlayerIdRef.current, gameplayPendingVersionRef.current !== null, card.id)) return;
    gameplayPendingVersionRef.current = state.version;
    setGameplayPending(true);
    setGameplayMessage(null);
    socket.send(createPlayCardRequest(card));
  };

  const sendGameplayAction = (action: 'REVEAL_TRUMP' | 'SELECT_TRUMP_HIDER' | 'COMPLETE_TRUMP_SETUP' | 'SELECT_HIDDEN_TRUMP', payload: Record<string, unknown> = {}) => {
    const socket = socketRef.current;
    const state = gameStateRef.current;
    if (!socket?.isConnected || !state || gameplayPendingVersionRef.current !== null) return;
    gameplayPendingVersionRef.current = state.version;
    setGameplayPending(true);
    setGameplayMessage(null);
    socket.send({ action, payload });
  };

  const handleHiddenTrumpSelection = (position: number) => {
    const state = gameStateRef.current;
    if (!state || state.phase !== 'HIDDEN_TRUMP_SELECTION' || state.trumpHiderId !== currentPlayerIdRef.current) return;
    if (position >= 0) sendGameplayAction('SELECT_HIDDEN_TRUMP', { card_index: position });
  };

  const handleSelectTrumpHider = (playerId: string) => {
    const state = gameStateRef.current;
    if (!state || state.phase !== 'FIRST_PLAYER_SELECTION' || roomRef.current.hostId !== currentPlayerIdRef.current || state.trumpHiderId) return;
    sendGameplayAction('SELECT_TRUMP_HIDER', { player_id: playerId });
  };

  const playableIds = gameState ? derivePlayableIds(gameState, currentPlayerId) : new Set<string>();
  const gameRoom = gameState ? { ...room, players: gameState.players } : room;

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
        {screen === 'lobby' && (
          <LobbyPage
            room={room}
            meId={currentPlayerId}
            pendingTeamSwitch={pendingTeamSwitch}
            startPending={startPending}
            actionMessage={lobbyActionMessage}
            pendingTeamRename={pendingTeamRename !== null}
            teamRenameMessage={teamRenameMessage}
            onSwitchTeam={handleSwitchTeam}
            onRenameTeam={handleRenameTeam}
            onClearTeamRenameMessage={() => setTeamRenameMessage(null)}
            onStart={handleStartGame}
            onLeave={handleLeave}
          />
        )}
        {screen === 'host-setup' && (
          <HostSetupPage
            room={room}
            meId={currentPlayerId}
            phase={setupPhase}
            firstPlayerPending={firstPlayerPending}
            cancelPending={cancelSetupPending}
            actionMessage={lobbyActionMessage}
            trumpHiderId={gameState?.trumpHiderId ?? null}
            trumpHiderPending={gameplayPending}
            gameplayMessage={gameplayMessage}
            onSelectTrumpHider={handleSelectTrumpHider}
            onSelectFirstPlayer={handleSelectFirstPlayer}
            onCancel={handleCancelGameSetup}
          />
        )}
        {screen === 'hidden-trump' && gameState && (
          <HiddenTrumpPage
            isHider={gameState.trumpHiderId === currentPlayerId}
            isReveal={gameState.phase === 'HIDDEN_TRUMP_REVEAL'}
            hiderName={room.players.find((player) => player.id === gameState.trumpHiderId)?.displayName ?? 'The selected player'}
            selectablePositions={gameState.selectableHiddenPositions}
            pending={gameplayPending}
            message={gameplayMessage}
            onConfirm={handleHiddenTrumpSelection}
            onComplete={() => sendGameplayAction('COMPLETE_TRUMP_SETUP')}
          />
        )}
        {screen === 'game' && gameState && <GameTablePage room={gameRoom} meId={currentPlayerId} phase={gameState.phase} hand={gameState.hand} playableIds={playableIds} trick={{ ...gameState.trick, currentPlayerId: gameState.currentTurn }} currentTrickLeader={gameState.currentTrickLeader} trump={gameState.trump} trumpHiderId={gameState.trumpHiderId} scores={gameState.scores} trickNumber={gameState.trickNumber} totalTricks={gameState.totalTricks} pending={gameplayPending} message={gameplayMessage} onPlayCard={handlePlayCard} onRevealTrump={() => sendGameplayAction('REVEAL_TRUMP')} onLeave={handleLeave} />}
        {screen === 'game-end' && gameState && <GameEndPage winningTeam={gameState.winner} scores={gameState.scores} players={gameState.players} meId={currentPlayerId} onLeave={handleLeave} />}
      </div>
    </>
  );
}

export default App;
