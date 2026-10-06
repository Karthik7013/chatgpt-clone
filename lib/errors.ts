/**
 * Turns a raw error from the model provider into something worth showing a
 * user. Providers report failures as free-form strings, so we match on
 * substrings rather than error types.
 *
 * Shared by the server (`app/api/chat/route.ts`) and the client
 * (`components/chat`) so both sides agree on what a given failure means.
 */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("429") || message.includes("rate_limit") || message.includes("quota")) {
    return "Rate limit exceeded. Try a different model or wait a moment.";
  }
  if (message.includes("PERMISSION_DENIED") || message.includes("403")) {
    return "API key error. Check your provider API key in .env.local.";
  }
  if (message.includes("INVALID_ARGUMENT") || message.includes("400")) {
    return "Invalid request. The prompt or file may be too large.";
  }
  if (message.includes("UNAVAILABLE") || message.includes("503")) {
    return "Service temporarily unavailable. Try again later.";
  }
  if (message.includes("deadline_exceeded") || message.includes("504")) {
    return "Request timed out. Try a shorter prompt or smaller file.";
  }
  return message || "Something went wrong. Try again.";
}

/**
 * Safe message for stream `error` chunks, used as
 * `toUIMessageStream({ onError: streamErrorMessage })`.
 *
 * Unlike `friendlyError`, this never echoes raw provider text: unknown
 * failures collapse to a generic message so server-side details (keys,
 * URLs, account ids) don't leak to the browser. Only well-understood,
 * user-actionable failures get a specific message.
 */
export function streamErrorMessage(error: unknown): string {
  if (isRateLimitError(error)) {
    return "Too many requests right now. Please wait a moment and try again.";
  }
  return "An error occurred.";
}

/** Detects 429s through `AI_APICallError.statusCode`, including one level
 * of `AI_RetryError.lastError` unwrapping, plus message substrings. */
function isRateLimitError(error: unknown): boolean {
  const holder =
    typeof error === "object" && error !== null
      ? (error as { lastError?: unknown })
      : null;
  const candidates = holder?.lastError !== undefined ? [holder.lastError, error] : [error];
  return candidates.some((candidate) => {
    if (typeof candidate === "object" && candidate !== null) {
      if ((candidate as { statusCode?: unknown }).statusCode === 429) {
        return true;
      }
    }
    const message =
      candidate instanceof Error ? candidate.message : String(candidate);
    return (
      message.includes("429") ||
      message.includes("rate_limit") ||
      message.includes("quota") ||
      message.includes("maxRetriesExceeded") ||
      message.includes("Too many requests") ||
      message.includes("server_overload")
    );
  });
}
