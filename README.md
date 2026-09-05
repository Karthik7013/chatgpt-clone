# ChatGPT-style chat app — Next.js + shadcn/ui + AI Elements + Vercel AI SDK

A fully wired, ready-to-run chat interface built on:

- **Next.js 16** (App Router)
- **shadcn/ui** primitives (Button, ScrollArea, Tooltip, DropdownMenu) — Tailwind v4
- **AI Elements**-style components (`components/ai-elements/*`) — Conversation, Message,
  Response, Reasoning, Tool, Sources, PromptInput, Loader — hand-written to match the
  real [ai-elements](https://github.com/vercel/ai-elements) API, so they're a drop-in
  match if you later run `npx ai-elements@latest add` for real.
- **Vercel AI SDK** (`ai` + `@ai-sdk/react` + `@ai-sdk/openai`)
- **GPT-5** via the OpenAI **Responses API**, with reasoning summaries and a real,
  hosted **web search** tool

## What it demonstrates

Every state you asked for is wired up end to end:

| State | Where it shows up |
|---|---|
| **Submitting** | `status === "submitted"` — animated "Contacting GPT-5…" row + spinner in the send button |
| **Reasoning** | Live reasoning summaries stream into a collapsible "Thinking…" panel that auto-collapses and shows "Thought for Ns" once done |
| **Streaming text** | Assistant text renders token-by-token via Streamdown (a streaming-aware markdown renderer) |
| **Tool calling** | GPT-5's hosted web search tool renders as a collapsible card showing `input-streaming → input-available → output-available` (or `output-error`), with the query and results |
| **Sources** | Web search citations collapse into a "N sources" list with links |
| **Error** | Inline banner + `useChat`'s `error` state |

It's also a genuine multi-chat app: a left sidebar (localStorage-backed, no DB needed)
lists past conversations, auto-titled from your first message, with rename/delete.

## Setup

```bash
npm install
cp .env.example .env.local
# then edit .env.local and set OPENAI_API_KEY
npm run dev
```

Open http://localhost:3000.

You need an OpenAI API key with access to GPT-5 and the Responses API (any current
standard OpenAI API key has this). Get one at
https://platform.openai.com/api-keys.

## How it's wired

- `app/api/chat/route.ts` — the only backend file. Calls `streamText` with
  `openai.responses("gpt-5")`, `openai.tools.webSearch()`, `reasoningEffort` /
  `reasoningSummary` provider options, and `stopWhen: stepCountIs(5)` so the model can
  call the tool and then keep going to write the final answer. Streams the result back
  as a UI message stream with `sendReasoning` and `sendSources` turned on.
- `components/chat-window.tsx` — the client side of one conversation. Calls `useChat`,
  walks `message.parts` and renders each part type (`text`, `reasoning`, `tool-web_search`,
  `source-url`) with the matching AI Elements component.
- `lib/chat-store.ts` — a tiny localStorage-backed store for the chat list + per-chat
  message history (no database needed for this demo).
- `components/chat-app.tsx` / `components/chat-sidebar.tsx` — the app shell: sidebar,
  new/rename/delete chat, mobile slide-over.

## Customizing

- **Swap the tool**: replace `openai.tools.webSearch(...)` in `app/api/chat/route.ts`
  with your own `tool({ description, inputSchema, execute })` — the UI already renders
  any `tool-*` part generically, no frontend changes needed.
- **Swap the model**: change `openai.responses("gpt-5")` to any other AI SDK model.
  Reasoning/tool UI will simply stay empty for models that don't support them.
- **Add real persistence**: replace `lib/chat-store.ts` with calls to your database —
  the rest of the app only depends on its exported function signatures.

## Notes

- Package versions in `package.json` were checked against the npm registry at the time
  this was generated (Sept 2026) — `next@16`, `ai@7`, `@ai-sdk/openai@4`,
  `@ai-sdk/react@4`, `tailwindcss@4`. Bump them later with your usual workflow.
- Uses Tailwind v4 (CSS-first config, no `tailwind.config.ts` needed) — theme tokens
  live in `app/globals.css`.
