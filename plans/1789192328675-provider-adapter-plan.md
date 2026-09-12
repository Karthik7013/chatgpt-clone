# Provider Adapter — Pluggable Multi-Provider Model Support

## Goal

Make Kilo Gateway, NVIDIA, OpenRouter, and future providers as easy to add as Gemini.
Models use `providerId:modelId` strings (e.g., `kilo:kilo-auto/free`, `nvidia:meta/llama-3.1-8b-instruct`,
`google:gemini-2.5-flash`).

## Context

- Next.js 16 App Router + Vercel AI SDK v7
- Currently: single provider (Google via `@ai-sdk/google`), hardcoded model list in `components/ui/model-selector.tsx`
- API route `app/api/chat/route.ts` calls `google(selectedModel)` directly
- `@ai-sdk/openai` is **not** installed yet (needed for Kilo, NVIDIA, OpenRouter)
- Model string flows: `ChatWindow` state → `DefaultChatTransport({ body: { model } })` → `route.ts`

## Decisions (Resolved)

| Decision | Chosen |
|---|---|
| Selector UI | Single grouped dropdown with collapsible provider sections |
| Model identifier | `providerId:modelId` string |
| API keys | Server env vars only (`KILO_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) |
| OpenAI-compatible providers | `createOpenAI({ baseURL, apiKey, headers }).chat(modelId)` |
| Config style | Static `PROVIDERS` array in `lib/providers/config.ts` |

## Provider Config (static list in `lib/providers/config.ts`)

- **google** — `@ai-sdk/google`; existing Gemini models; env: `GOOGLE_GENERATIVE_AI_API_KEY`
- **kilo** — `@ai-sdk/openai`; base: `https://api.kilo.ai/api/gateway`; env: `KILO_API_KEY`
- **nvidia** — `@ai-sdk/openai`; base: `https://integrate.api.nvidia.com/v1`; env: `NVIDIA_API_KEY`
- **openrouter** — `@ai-sdk/openai`; base: `https://openrouter.ai/api/v1`; env: `OPENROUTER_API_KEY`; headers: `HTTP-Referer`, `X-Title`

## Error Types (thrown by factory)

```ts
class ProviderNotFoundError  // 400 — providerId not in PROVIDERS
class ProviderKeyMissingError // 503 — env var not set
class ModelNotFoundError     // 400 — modelId not in provider's models list
```

## Task List

### 1. Install dependency
```
npm install @ai-sdk/openai
```

### 2. Create `lib/providers/types.ts`
`ProviderType`, `ModelEntry`, `ProviderConfig` (with `headers?: Record<string,string>`)

### 3. Create `lib/providers/config.ts`
Static `PROVIDERS: ProviderConfig[]` array with google, kilo, nvidia, openrouter.

### 4. Create `lib/providers/env.ts`
`isProviderKeyConfigured(provider): boolean`
`getProviderKey(provider): string | undefined`

### 5. Create `lib/providers/factory.ts`
```ts
export function parseModelIdentifier(id: string): { providerId: string; modelId: string }
// "google:gemini-2.5-flash" → { providerId: "google", modelId: "gemini-2.5-flash" }
// "gemini-2.5-flash" (bare) → { providerId: "google", modelId: "gemini-2.5-flash" } (backward compat)

export async function createModel(identifier: string): Promise<LanguageModel>
// Parses id, looks up config, validates key + model, returns google() or createOpenAI().chat()
// Throws ProviderNotFoundError / ProviderKeyMissingError / ModelNotFoundError
```

### 6. Create `app/api/models/route.ts` (GET)
Returns providers **whose API key is present**, each with their models. No auth needed —
it's just metadata. Used by the client to render the selector.

### 7. Create `lib/hooks/use-providers.ts`
Client hook: `fetch("/api/models")` on mount, returns `{ providers, loading, error }`.

### 8. Rewrite `components/ui/model-selector.tsx`
- Fetch via `use-providers` hook
- Popover with collapsible provider sections
- Each provider: name + green check / red "not configured" badge
- Each model: name, description, free tag
- Click → `onModelChange("providerId:modelId")`

### 9. Modify `app/api/chat/route.ts`
Replace `google(selectedModel)` with:
```ts
import { createModel } from "@/lib/providers/factory";
const model = await createModel(selectedModel);
```
Wrap in try/catch → return `{ error: e.message }` with appropriate status code.

### 10. Modify `components/chat-window.tsx`
- Default model: `"google:gemini-2.5-flash"`
- Update `getErrorMessage` to handle provider/key/model errors

### 11. Update `.env.example`
Add `KILO_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` (commented) with instructions.

## Validation

1. `npm install` succeeds
2. `npm run lint` — zero new warnings
3. `npm run build` — compiles
4. `curl /api/models` returns providers with keys set
5. Select model from each provider → streaming works
6. Old chats (bare `"gemini-3.5-flash"`) still work

## Risks / Edge Cases

- **Google SDK API key**: `@ai-sdk/google` reads `GOOGLE_GENERATIVE_AI_API_KEY` or `GOOGLE_API_KEY`
  from env automatically — no explicit key param needed. The factory passes model name only.
- **OpenRouter referer**: `process.env.OPENROUTER_REFERER` evaluated at config import time (server
  only — `config.ts` is never imported client-side). Falls back to `http://localhost:3000`.
- **Model ID with colon**: `stepfun/step-3.7-flash:free` — the `:` after the model name is part
  of the model ID, not the identifier separator. The factory splits on the **first** `:` only:
  `"kilo:stepfun/step-3.7-flash:free"` → providerId=`"kilo"`, modelId=`"stepfun/step-3.7-flash:free"`.
- **Unconfigured provider selected**: If user picks a model from an unconfigured provider,
  `/api/models` won't even show it (filtered server-side), so this can't happen.

## Out of Scope

- Dynamic model discovery via provider APIs (static config for v1)
- Per-model API key overrides
- Provider failover / retry logic
- Cost tracking UI