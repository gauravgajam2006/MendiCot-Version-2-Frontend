/**
 * api.ts – Core networking primitives for the MendiCot frontend.
 *
 * Every HTTP call in the app should flow through the `request()` helper
 * exported here.  It handles JSON serialisation, content-type headers,
 * and maps non-2xx responses into typed `ApiError` instances that
 * callers can pattern-match on.
 *
 * No external dependencies — browser Fetch API only.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Resolves and normalises the API base URL from environment configuration.
 *
 * Defaults to 'http://127.0.0.1:8000' for local development.
 * Strips trailing slashes and surrounding whitespace.
 */
export function resolveBaseUrl(envUrl?: string): string {
  const trimmed = envUrl?.trim();
  if (!trimmed) {
    return 'http://127.0.0.1:8000';
  }
  return trimmed.replace(/\/+$/, '');
}

/** Base URL of the FastAPI backend. */
export const BASE_URL = resolveBaseUrl(import.meta.env?.VITE_API_BASE_URL);

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Structured error returned when the backend responds with a non-2xx status. */
export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  /** The parsed JSON body, if the server returned one. `null` otherwise. */
  public readonly body: unknown;

  constructor(
    status: number,
    statusText: string,
    body: unknown,
  ) {
    super(`API ${status} ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

// ---------------------------------------------------------------------------
// Request options
// ---------------------------------------------------------------------------

export interface RequestOptions {
  /** HTTP method (defaults to GET). */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serialisable request body.  Automatically stringified. */
  body?: unknown;
  /** Extra headers merged on top of the defaults. */
  headers?: Record<string, string>;
  /** Optional AbortSignal for cancellation. */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

/**
 * Generic, strongly-typed HTTP request helper.
 *
 * ```ts
 * const room = await request<CreateRoomResponse>('/rooms', {
 *   method: 'POST',
 *   body: { host_name: 'Gaurav', player_count: 4, trump_mode: 'normal' },
 * });
 * ```
 *
 * @typeParam T  The expected shape of the parsed JSON response.
 * @param path   URL path appended to `BASE_URL` (must start with `/`).
 * @param opts   Optional request configuration.
 * @returns      The parsed response body typed as `T`.
 * @throws {ApiError} when the server responds with a non-2xx status.
 */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal } = opts;

  const mergedHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  // Automatically set Content-Type for requests with a body.
  if (body !== undefined) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const res = await fetch(`${BASE_URL}${normalizedPath}`, {
    method,
    headers: mergedHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  // --- Error handling ---
  if (!res.ok) {
    let errorBody: unknown = null;
    try {
      errorBody = await res.json();
    } catch {
      // Response may not be JSON (e.g. 502 from a proxy). That's fine.
    }
    throw new ApiError(res.status, res.statusText, errorBody);
  }

  // --- Success: parse JSON ---
  // A 204 No Content (or similar) has no body to parse.
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}
