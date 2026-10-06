const CHAT_PATH = /^\/c\/([^/]+)$/;

export function chatPath(id: string): string {
  return `/c/${encodeURIComponent(id)}`;
}

/** The chat id in the current URL, or null when the URL is not a chat. */
export function chatIdFromPath(pathname: string): string | null {
  const match = CHAT_PATH.exec(pathname);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** Moves the URL to a chat without remounting the tree, so no stream aborts. */
export function writeChatUrl(id: string, mode: "push" | "replace") {
  const url = chatPath(id);
  if (window.location.pathname === url) return;
  if (mode === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}
