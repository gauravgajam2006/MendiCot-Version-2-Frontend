/**
 * websocket.ts – Reusable WebSocket wrapper for the MendiCot game channel.
 *
 * Usage:
 * ```ts
 * const ws = new GameSocket({
 *   onOpen:    ()     => console.log('connected'),
 *   onMessage: (msg)  => dispatch(msg),
 *   onClose:   (code) => console.log('closed', code),
 *   onError:   (evt)  => console.error(evt),
 * });
 *
 * ws.connect(roomId, sessionToken);
 * ws.send({
 *   action: 'START_GAME',
 *   payload: { hidden_trump_mode: false },
 * });
 * ws.close();
 * ```
 *
 * Design decisions:
 *   • No auto-reconnect — that will be layered on later.
 *   • All inbound messages are JSON-parsed before invoking `onMessage`.
 *   • `send()` accepts a plain object and stringifies it.
 */

import { BASE_URL } from './api.ts';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

/**
 * Envelope for every message sent from the client to the server.
 *
 * Actions may include an optional object payload.
 */
export interface WsOutboundMessage {
  action: string;
  payload?: Record<string, unknown>;
}

/**
 * Envelope for every message received from the server.
 *
 * The `type` field discriminates between event kinds (e.g.
 * `player_joined`, `card_played`, `trick_won`, …).
 */
export interface WsInboundMessage {
  type: string;
  payload?: unknown;
}

export type LeaveRoomResult = 'acknowledged' | 'closed' | 'timeout' | 'not-connected' | 'send-failed';

// ---------------------------------------------------------------------------
// Callback signatures
// ---------------------------------------------------------------------------

export interface GameSocketCallbacks {
  /** Fired when the WebSocket connection is successfully opened. */
  onOpen?: () => void;
  /** Fired for every JSON message received from the server. */
  onMessage?: (message: WsInboundMessage) => void;
  /** Fired when the connection closes (cleanly or otherwise). */
  onClose?: (code: number, reason: string) => void;
  /** Fired on a WebSocket-level error. */
  onError?: (event: Event) => void;
}

// ---------------------------------------------------------------------------
// WebSocket wrapper
// ---------------------------------------------------------------------------

/**
 * Derive the WS base from the HTTP base URL.
 * http://...  -> ws://...
 * https://... -> wss://...
 * ws://...    -> ws://...
 * wss://...   -> wss://...
 *
 * Throws an Error for unsupported URL schemes or malformed inputs.
 */
export function toWsUrl(httpBase: string): string {
  const trimmed = httpBase.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('https://')) {
    return trimmed.replace(/^https:\/\//, 'wss://');
  }
  if (trimmed.startsWith('http://')) {
    return trimmed.replace(/^http:\/\//, 'ws://');
  }
  if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
    return trimmed;
  }
  throw new Error(`Unsupported API URL scheme for WebSocket conversion: "${httpBase}"`);
}

export class GameSocket {
  private ws: WebSocket | null = null;
  private callbacks: GameSocketCallbacks;
  private pendingLeave: {
    resolve: (result: LeaveRoomResult) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  } | null = null;

  constructor(callbacks: GameSocketCallbacks = {}) {
    this.callbacks = callbacks;
  }

  // ---- Lifecycle ----------------------------------------------------------

  /**
   * Open a WebSocket connection to the game room.
   *
   * @param roomId        The server-side room identifier.
   * @param sessionToken  The session token received from createRoom / joinRoom.
   */
  connect(roomId: string, sessionToken: string): void {
    // Prevent duplicate connections.
    this.close();

    const wsBase = toWsUrl(BASE_URL);
    const url = `${wsBase}/ws/rooms/${encodeURIComponent(roomId)}?token=${encodeURIComponent(sessionToken)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.callbacks.onOpen?.();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data as string) as WsInboundMessage;
        this.callbacks.onMessage?.(parsed);

        if (parsed.type === 'ACTION_SUCCESS' && this.pendingLeave) {
          this.finishLeave('acknowledged');
          this.close();
        }
      } catch {
        // If the server sends non-JSON (shouldn't happen), surface as error.
        console.error('[GameSocket] Failed to parse inbound message:', event.data);
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.finishLeave('closed');
      this.callbacks.onClose?.(event.code, event.reason);
      this.ws = null;
    };

    this.ws.onerror = (event: Event) => {
      this.callbacks.onError?.(event);
    };
  }

  /**
   * Send a JSON-encoded action to the server.
   *
   * Silently no-ops if the socket is not open.
   */
  send(message: WsOutboundMessage): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch {
        console.warn('[GameSocket] Failed to send an action.');
        return false;
      }
    }
    console.warn('[GameSocket] send() called while socket is not open.');
    return false;
  }

  /** Intentionally leave the current room before closing its WebSocket. */
  leaveRoom(timeoutMs = 750): Promise<LeaveRoomResult> {
    const socket = this.ws;
    if (socket?.readyState !== WebSocket.OPEN) {
      console.warn('[GameSocket] Cannot send LEAVE_ROOM because the socket is not open.');
      this.close();
      return Promise.resolve('not-connected');
    }

    if (this.pendingLeave) return Promise.resolve('closed');

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.finishLeave('timeout');
        this.close();
      }, timeoutMs);

      this.pendingLeave = { resolve, timeoutId };

      try {
        socket.send(JSON.stringify({ action: 'LEAVE_ROOM', payload: {} }));
      } catch {
        console.warn('[GameSocket] Failed to send LEAVE_ROOM.');
        this.finishLeave('send-failed');
        this.close();
      }
    });
  }
  /** Gracefully close the connection. */
  close(): void {
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private finishLeave(result: LeaveRoomResult): void {
    if (!this.pendingLeave) return;

    clearTimeout(this.pendingLeave.timeoutId);
    const { resolve } = this.pendingLeave;
    this.pendingLeave = null;
    resolve(result);
  }

  // ---- Introspection ------------------------------------------------------

  /** Whether the socket is currently in the OPEN state. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
