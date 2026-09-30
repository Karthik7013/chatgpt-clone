# Plan — URL follows the open chat

## Context

The app already owns chat ids on the server, created before any message is sent:

- `POST /api/chats` mints a `randomUUID()` and inserts the `chats` doc (`app/api/chats/route.ts:31`).
- `useChats` calls `createChat()` during bootstrap and on "New chat" (`components/chat/use-chats.ts:77,130`).
- `app/c/[chatId]/page.tsx` is a client route that passes `initialChatId` into `ChatApp`.

So no `data-*` stream part and no id-generation change is needed — a chat id exists client-side before the first `sendMessage`.

What is missing: nothing in the repo writes to browser history. Selecting a chat in the sidebar only calls `setActiveChatId` (`components/chat/use-chats.ts:196`), so the URL stays at `/` or at whatever id the page was opened with, and Back/Forward does nothing. `/c/[chatId]` works as an entry point only.

Goal: the URL always reflects the open chat, and Back/Forward walk chat history — without remounting the chat component and aborting an in-flight stream.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Id ownership | Unchanged (server, pre-stream) | Already correct; data parts would be redundant |
| URL writes | `window.history.pushState` / `replaceState`, not `router.push`/`router.replace` | App Router navigation to a different param can remount the segment and abort the in-flight `fetch`; raw history writes leave the component tree alone |
| Switch semantics | `pushState` on sidebar switch and on New chat | Back/Forward walk chats, which is what users expect from a chat app |
| Message persistence | Unchanged (debounced client autosave) | Out of scope; the id already exists before the first token |
| Unknown `/c/[id]` | Keep today's fallback (open newest chat), then correct the URL | In scope was URL sync only; a 404 screen is a separate change |

## Tasks

### 1. `components/chat/use-chats.ts` — own URL writes

Add a small helper in this file (or `lib/chat-store.ts` if kept with the other chat-store calls — prefer this file, it is the only consumer):

```ts
const CHAT_PATH = /^\/c\/([^/]+)$/;

function chatPath(id: string): string {
  return `/c/${encodeURIComponent(id)}`;
}
```

Then, in this order:

1. **Bootstrap URL correction.** After `boot()` settles and `activeChatId` is set, if `location.pathname !== chatPath(activeChatId)`, call
   `window.history.replaceState(null, "", chatPath(activeChatId))`.
   This covers all three entry cases at once: landing on `/` (most chats), landing on a known `/c/[id]` (no-op), landing on an unknown `/c/[id]` (today's fallback to `existing[0]` now gets the right URL). Keep it inside the existing `boot()` flow, guarded by the existing `cancelled` flag.

2. **`selectChat` becomes a real function** instead of the bare `setActiveChatId` alias (keep the same name so `components/chat/app.tsx:46` is untouched):
   - If `id === activeChatId`, return without touching history — re-clicking the active chat must not stack history entries.
   - Otherwise `setActiveChatId(id)` then `window.history.pushState(null, "", chatPath(id))`.

3. **`newChat`** (after `setActiveChatId(chat.id)`) pushes `chatPath(chat.id)`. Note the existing early return when the current chat is empty: the user stays put, so the URL must not change either.

4. **Delete-driven moves use `replaceState`, not push.** In `deleteChatById`, both branches (switching to `remaining[0]`, or creating a fresh chat) move the user off a URL that no longer resolves. `replaceState` keeps the dead id out of history. Same for the bootstrap correction in step 1.

5. **popstate listener.** Add a `React.useEffect` with `[]` deps:
   - Keep the latest `chats` list in a ref (`chatsRef.current = chats` on each render) so the handler reads fresh data without re-subscribing.
   - On `popstate`, match `location.pathname` against `CHAT_PATH`. If no match, ignore (the user navigated off `/c/...`; Next owns that case).
   - If the id equals `activeChatId`, ignore.
   - If the id is in `chatsRef.current`, `setActiveChatId(id)` and **do not** write history — the browser already did.
   - If the id is unknown (deleted chat, stale entry from another tab): `await refreshChats()`, re-check. Still missing → `setActiveChatId(firstChat.id)` plus `replaceState` to `firstChat.id`, and replace rather than push so the dead entry is cleaned out. If the list is empty after refresh, leave state alone and let the next user action establish a URL.

6. **Keep `initialChatIdRef` as-is.** `useChats` reads `initialChatId` once (use-chats.ts:53); a popstate-driven `setActiveChatId` is a plain state change and works with that. Do not convert it into a prop-driven sync — that is what would remount the tree.

### 2. Files to leave alone

- `app/c/[chatId]/page.tsx` — already forwards `initialChatId`; no change needed.
- `app/page.tsx` — bootstrap step 1 moves `/` to `/c/<id>` on its own.
- `components/chat/window.tsx` — `<ChatWindow key={activeChatId}>` (`components/chat/app.tsx:82`) already remounts per chat, so a popped chat loads its own messages via `usePersistedMessages`.
- `app/api/chat/route.ts`, `lib/chat-store.ts`, all API routes — untouched.

## Risks

- **Next patches `history`.** Next 16's App Router wraps `pushState`/`replaceState` and also listens for `popstate` itself. Both handlers converge on the same target id, so a duplicate render is the worst case, but confirm in dev that a popstate between two chats does **not** unmount `ChatWindow` — if it does, the in-flight stream aborts and the guard above fails. If that happens, the fallback is `key={activeChatId}`-based remount plus an explicit abort-safety check rather than App Router navigation.
- **Stale `chats` in the popstate handler** — handled by the ref in task 5.
- **Two tabs open on the same chat.** One tab's delete leaves the other's URL dead until a navigation. Out of scope; noted so it is not mistaken for a regression.
- **Switching chats mid-stream aborts the reply.** Pre-existing behaviour of `key={activeChatId}` unmounting `ChatSession`; not introduced here, and not fixed here.

## Validation

No test runner exists in this package (`package.json` has only `dev`, `build`, `start`, `lint`), so validation is static plus manual.

1. `npm run lint` and `npx tsc --noEmit` — both scoped to the repo; `node_modules` is not installed in the plan-authoring workspace, so these must run in the implementation workspace after `npm install`.
2. Before writing code, read the Next 16 navigation guide in `node_modules/next/dist/docs/` (per `AGENTS.md`) for `pushState`/`popstate` behaviour and any deprecation notice on raw history writes.
3. Manual, in `npm run dev` against a real `MONGODB_URI`:
   - Load `/`, send a message, confirm the URL becomes `/c/<uuid>` and the reply keeps streaming (no spinner hang).
   - Switch between two chats in the sidebar: URL follows, Back returns to the previous chat, Forward returns again, messages are correct on each.
   - Click the already-active chat in the sidebar: no extra history entry (press Back once, expect to leave `/c/...` rather than staying).
   - New chat on an already-empty chat: URL does not change.
   - Reload a shared `/c/<id>` URL: chat loads; send a follow-up message and it lands in the same chat.
   - Load `/c/does-not-exist`: falls back to a real chat and the URL is rewritten to that chat's id.
   - Delete the open chat: URL is replaced with the newly opened chat's id, and Back does not return to the deleted id.
   - Delete a chat from the sidebar that is not open: URL unchanged.
   - With a reply streaming, press Stop then switch chats — no unhandled error in the console.

## Out of scope

- Server-side message persistence (moving autosave into `/api/chat`), which would make a mid-stream bookmark resolve.
- Copy-link button in `components/chat/chat-header.tsx`.
- A not-found screen for unknown chat ids.
- Authentication / ownership checks on `/c/[chatId]` — the app has no auth (`ChatDoc.userId` is always `null`).