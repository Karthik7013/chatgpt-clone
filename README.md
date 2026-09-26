# Chat app — Next.js + AI SDK

A multi-chat interface with streaming responses, tool calling, file attachments and
MongoDB persistence.

- **Next.js 16** (App Router, React 19)
- **Vercel AI SDK** (`ai` + `@ai-sdk/react`) for streaming and tool calls
- **MongoDB** for chats and messages
- **shadcn/ui** + Tailwind v4 for chrome
- **AI Elements**-style components in `components/ai-elements/`, hand-written to match the
  [ai-elements](https://github.com/vercel/ai-elements) API

## Setup

```bash
npm install
cp .env.example .env.local
# fill in at least one provider key and MONGODB_URI
npm run dev
```

Open http://localhost:3000.

You need at least one provider key (OpenRouter, Kilo Gateway or NVIDIA NIM — see
`.env.example`) and a MongoDB connection string. Without a key the app still loads and
the model list is empty; without MongoDB, chats cannot be saved.

Requires Node 22 or newer (`ai@7` declares `>=22`).

## How a message flows

```
browser                     server
   |                          |
   |-- POST /api/chat -------->|
   |                          | readChatRequest      validate the body
   |                          | attachFileContents   inline small text files
   |                          | loadTools            build the tool set
   |                          | streamText            run the model
   |<-- UI message stream -----|
   | render parts as they arrive
```

`app/api/chat/route.ts` is deliberately short and reads top to bottom. Each step above
is its own module under `lib/`.

## Layout

| Path | What lives there |
|---|---|
| `app/api/chat/route.ts` | The chat endpoint. Orchestration only. |
| `app/api/chats/**` | CRUD for chats and their messages. |
| `lib/providers/` | Model providers, config and the factory. |
| `lib/tools/registry.ts` | Which tools exist and which are enabled. |
| `lib/tools/server/` | One file per tool implementation. |
| `lib/chat-store.ts` | Client-side calls to the chats API. |
| `lib/mongodb.ts` | Connection and collection helpers. |
| `components/chat/` | The chat screen, split by responsibility. |
| `components/tool-cards/` | One card per tool, plus the lookup registry. |
| `components/ai-elements/` | Vendored-style UI primitives. Do not edit casually. |

`components/chat/` in detail:

| File | Responsibility |
|---|---|
| `app.tsx` | Layout: which screen to show, and wiring. |
| `use-chats.ts` | Chat list state and every operation on it. |
| `chat-header.tsx` | Title bar and its rename draft. |
| `sidebar.tsx` | The chat list. |
| `window.tsx` | The live conversation. |
| `message-bubble.tsx` | One message and its parts. |
| `chat-composer.tsx` | The input box and toolbar. |
| `use-attachment-upload.ts` | Uploading and the pending file list. |
| `use-persisted-messages.ts` | Loading and debounced saving. |
| `use-copy-button.ts` | Clipboard with timer cleanup. |

## Tools

A tool is added in three places. The registry is the switchboard.

1. **Implement it** — add `lib/tools/server/<name>.ts` exporting a `tool({...})`, and
   register it in `lib/tools/server/index.ts`.
2. **Turn it on** — add an entry to `TOOL_REGISTRY` in `lib/tools/registry.ts` with
   `enabled: true`.
3. **Optionally give it a card** — add `components/tool-cards/<name>-card.tsx` and one
   line to `TOOL_CARDS` in `components/tool-cards/registry.tsx`.

A tool with no card still works: the UI falls back to a generic collapsible block that
shows its input and output. Four tools (`weather`, `generate-file`, `generate-files`,
`qr-code`) are fully implemented and have cards, but are switched off in the registry so
the model is not offered them. Flip `enabled` to `true` to use one.

Web search is also gated at request time by the toggle in the composer, which sends
`webSearchEnabled` in the request body.

`TOOL_REGISTRY` must stay dependency-free. It is imported by both server and client code,
so adding `zod`, `ai` or React to it will break the server/client boundary.

## Adding a model provider

Providers live in `lib/providers/`. `config.ts` holds the id, label and env var for each;
`factory.ts` turns an id like `kilo:kilo-auto/free` into a model. The model picker in the
composer reads from `/api/models`, which lists whatever the configured providers expose.

## Verifying a change

```bash
npx tsc --noEmit   # types
npm run lint       # eslint
npm run build      # production build
```

There is no test runner yet. When adding one, Vitest is the intended choice, and these
functions are pure and worth covering first, roughly in this order:

1. `baseToolName` and `partToolName` in `lib/tool-names.ts`
2. `friendlyError` in `lib/errors.ts`
3. `titleFromMessage` in `lib/chat-store.ts`
4. model id parsing in `lib/providers/config.ts`
5. `extractTextFromHtml` in `lib/tools/html-to-text.ts`
6. a test that `TOOL_REGISTRY` has no duplicate names

## Notes

- `components/ai-elements/` is written to match the upstream ai-elements API so that
  running `npx ai-elements@latest add` later can replace it. Treat it as vendored.
- Two ESLint rules are disabled for `components/ui/**` and `components/ai-elements/**`
  only. The rest of the codebase is expected to lint clean.
- `lib/mcp.ts` is a deliberate stub. MCP is not wired up; it documents the seam where it
  would connect.
