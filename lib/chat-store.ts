import type { UIMessage } from "ai";

export type ChatSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // non-JSON error body; keep the status-based message
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function listChats(): Promise<ChatSummary[]> {
  return request<ChatSummary[]>("/api/chats");
}

export async function createChat(): Promise<ChatSummary> {
  return request<ChatSummary>("/api/chats", {
    method: "POST",
    headers: JSON_HEADERS,
  });
}

export async function touchChat(id: string, title?: string): Promise<void> {
  await request<unknown>(`/api/chats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(title ? { title } : {}),
  });
}

export async function renameChat(id: string, title: string): Promise<void> {
  await touchChat(id, title);
}

export async function deleteChat(id: string): Promise<void> {
  await request<unknown>(`/api/chats/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function loadMessages(id: string): Promise<UIMessage[]> {
  return request<UIMessage[]>(
    `/api/chats/${encodeURIComponent(id)}/messages`,
  );
}

export async function saveMessages(
  id: string,
  messages: UIMessage[],
): Promise<void> {
  await request<unknown>(`/api/chats/${encodeURIComponent(id)}/messages`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(messages),
  });
}

/** Derives a short chat title from the first user message's text parts. */
export function titleFromMessage(message: UIMessage): string {
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 48)}…` : text;
}
