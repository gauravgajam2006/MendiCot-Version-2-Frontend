import type { WsInboundMessage, WsOutboundMessage } from '@/api/websocket';

export type PushRegistrationStatus =
  | 'permission_not_granted'
  | 'firebase_not_configured'
  | 'messaging_unsupported'
  | 'service_worker_failed'
  | 'token_failed'
  | 'token_ready'
  | 'waiting_for_session'
  | 'registering'
  | 'registered'
  | 'registration_failed';

export type PushTokenSetupStatus = Extract<PushRegistrationStatus,
  | 'permission_not_granted'
  | 'firebase_not_configured'
  | 'messaging_unsupported'
  | 'service_worker_failed'
  | 'token_failed'>;

export interface PushRegistrationConnection {
  generation: number;
  send: (message: WsOutboundMessage) => boolean;
}

type StatusListener = (status: PushRegistrationStatus) => void;

function normalizedAction(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const value = record.action ?? record.action_type ?? record.request_action;
  return typeof value === 'string' ? value.trim().toUpperCase() : null;
}

function describesPushRegistration(payload: unknown): boolean {
  if (typeof payload === 'string') return /REGISTER_PUSH|push registration/i.test(payload);
  if (!payload || typeof payload !== 'object') return false;
  try { return /REGISTER_PUSH|push registration/i.test(JSON.stringify(payload)); } catch { return false; }
}

/** Coordinates one FCM token with one authoritative room-socket generation. */
export class PushRegistrationCoordinator {
  private connection: PushRegistrationConnection | null = null;
  private token: string | null = null;
  private enabled = false;
  private pendingToken: string | null = null;
  private acknowledgedToken: string | null = null;
  private registrationAttempts = 0;
  private status: PushRegistrationStatus = 'permission_not_granted';
  private readonly listeners = new Set<StatusListener>();

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  get currentStatus(): PushRegistrationStatus { return this.status; }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) this.tryRegister();
  }

  setConnection(connection: PushRegistrationConnection | null): void {
    if (this.connection?.generation === connection?.generation) return;
    this.connection = connection;
    this.pendingToken = null;
    this.acknowledgedToken = null;
    this.registrationAttempts = 0;
    if (!connection && this.token) this.setStatus('waiting_for_session');
    else this.tryRegister();
  }

  setToken(token: string): void {
    if (!token) {
      this.setSetupFailure('token_failed');
      return;
    }
    if (this.pendingToken === token) return;
    if (this.acknowledgedToken === token) {
      this.setStatus('registered');
      return;
    }
    if (this.token !== token) {
      this.token = token;
      this.pendingToken = null;
      this.acknowledgedToken = null;
      this.registrationAttempts = 0;
    }
    this.setStatus('token_ready');
    this.tryRegister();
  }

  setSetupFailure(status: PushTokenSetupStatus): void {
    this.token = null;
    this.pendingToken = null;
    this.acknowledgedToken = null;
    this.setStatus(status);
  }

  /** Generic ACTION_SUCCESS is the backend's uncorrelated action acknowledgement. */
  handleServerMessage(message: WsInboundMessage): boolean {
    if (!this.pendingToken) return false;
    const type = message.type.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const action = normalizedAction(message.payload);
    if ((type === 'ACTION_SUCCESS' && (!action || action === 'REGISTER_PUSH')) || type === 'PUSH_REGISTRATION_SUCCESS') {
      this.acknowledgedToken = this.pendingToken;
      this.pendingToken = null;
      this.setStatus('registered');
      return true;
    }
    if ((type === 'ERROR' && describesPushRegistration(message.payload)) || type === 'PUSH_REGISTRATION_FAILED') {
      this.pendingToken = null;
      this.setStatus('registration_failed');
      return true;
    }
    return false;
  }

  retry(): boolean {
    if (this.status !== 'registration_failed' && this.status !== 'registering') return false;
    this.pendingToken = null;
    return this.tryRegister();
  }

  registrationTimedOut(): boolean {
    if (!this.pendingToken) return false;
    this.pendingToken = null;
    this.setStatus('registration_failed');
    return this.tryRegister();
  }

  updatePreference(enabled: boolean): 'updated' | 'registering' | 'skipped' {
    this.enabled = enabled;
    if (!this.connection) return 'skipped';
    if (!enabled) {
      return this.connection.send({ action: 'UPDATE_PUSH_PREFERENCE', payload: { enabled: false } }) ? 'updated' : 'skipped';
    }
    if (this.acknowledgedToken === this.token && this.token) {
      return this.connection.send({ action: 'UPDATE_PUSH_PREFERENCE', payload: { enabled: true } }) ? 'updated' : 'skipped';
    }
    return this.tryRegister() ? 'registering' : 'skipped';
  }

  get hasRegistration(): boolean {
    return this.status === 'registered' && this.acknowledgedToken !== null;
  }

  private tryRegister(): boolean {
    if (!this.enabled || !this.token) return false;
    if (!this.connection) {
      this.setStatus('waiting_for_session');
      return false;
    }
    if (this.acknowledgedToken === this.token) {
      this.setStatus('registered');
      return false;
    }
    if (this.pendingToken === this.token) return false;
    if (this.registrationAttempts >= 2) {
      this.setStatus('registration_failed');
      return false;
    }
    const sent = this.connection.send({
      action: 'REGISTER_PUSH',
      payload: { registration_id: this.token, enabled: true },
    });
    if (!sent) {
      this.setStatus('registration_failed');
      return false;
    }
    this.pendingToken = this.token;
    this.registrationAttempts += 1;
    this.setStatus('registering');
    return true;
  }

  private setStatus(status: PushRegistrationStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}
