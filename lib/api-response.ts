/**
 * Shared API response helpers (server-only).
 *
 * Every JSON route in `app/api/**` uses the same shape so the client
 * (`lib/chat-store.ts`) can parse failures uniformly:
 *   success → the payload directly
 *   failure → `{ error: string }` with the matching HTTP status
 *
 * Server faults (5xx) are logged with a `[tag]` prefix along with the
 * caught error; client faults (4xx) are returned silently, matching the
 * previous per-route behavior.
 */

export function apiOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function apiError(
  tag: string,
  message: string,
  status = 500,
  cause?: unknown,
): Response {
  if (status >= 500) console.error(`[${tag}] ${message}`, cause);
  return Response.json({ error: message }, { status });
}
