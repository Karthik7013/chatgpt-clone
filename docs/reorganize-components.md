# Codebase Reorganization Plan

## Goal
Reorganize components for better maintainability, modularity, and navigation.

## Changes

### 1. Move tool cards into `components/tool-cards/`

**Before:** 6 tool cards scattered in `components/` root
**After:** `components/tool-cards/index.ts` barrel export + individual files

Files to move:
- `components/file-card.tsx` → `components/tool-cards/file-card.tsx`
- `components/qr-card.tsx` → `components/tool-cards/qr-card.tsx`
- `components/time-card.tsx` → `components/tool-cards/time-card.tsx`
- `components/url-card.tsx` → `components/tool-cards/url-card.tsx`
- `components/weather-card.tsx` → `components/tool-cards/weather-card.tsx`
- `components/html-preview-card.tsx` → `components/tool-cards/html-preview-card.tsx`

Create `components/tool-cards/index.ts` barrel export.

**Update imports in:** `components/chat-window.tsx` (6 import lines)

### 2. Move model-selector out of `components/ui/`

**Before:** `components/ui/model-selector.tsx` (app-specific, mixed with shadcn primitives)
**After:** `components/model-selector.tsx`

**Update imports in:** `components/chat-window.tsx` (1 import line)

### 3. Move chat components into `components/chat/`

**Before:** `chat-app.tsx`, `chat-sidebar.tsx`, `chat-window.tsx` in `components/` root
**After:** `components/chat/app.tsx`, `components/chat/sidebar.tsx`, `components/chat/window.tsx`

Create `components/chat/index.ts` barrel export.

**Update imports in:** `app/page.tsx` (1 import line)

## Import update summary

| File | Old import | New import |
|------|-----------|------------|
| `app/page.tsx` | `@/components/chat-app` | `@/components/chat` |
| `components/chat/window.tsx` | `@/components/file-card` etc. | `@/components/tool-cards` |
| `components/chat/window.tsx` | `@/components/ui/model-selector` | `@/components/model-selector` |
| `components/chat/app.tsx` | `@/components/chat-sidebar` | `@/components/chat/sidebar` |
| `components/chat/app.tsx` | `@/components/chat-window` | `@/components/chat/window` |

## What stays the same
- `components/ai-elements/` — already well-organized
- `components/ui/` — clean shadcn primitives only (minus model-selector)
- `lib/` — already well-organized (providers/, hooks/)
- `app/api/` — already well-organized
