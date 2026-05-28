# CLAUDE.md — Cardapidex dashboard

Admin dashboard for the Cardapidex multi-tenant SaaS platform. React + TypeScript + Vite. Current production may still be served from `painel.pastita.com.br` until DNS/deploy is fully migrated.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (custom design system via CSS vars in `index.css`)
- **React Router v6** (file-based page structure in `src/pages/`)
- **React Query (@tanstack/react-query)** for server state
- **Axios** (`src/services/api.ts`) — token auth via `Authorization: Token <token>` header
- **date-fns** with `ptBR` locale
- **@heroicons/react** and **lucide-react** for icons

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # tsc + vite build
npm run lint         # ESLint
npm test             # Jest
```

## Architecture

### File Structure

```
src/
  components/     # Shared UI (Button, Modal, PageTitle, etc.)
    chat/         # WhatsApp chat: ChatWindow, MessageBubble, AudioPlayer
  hooks/          # useWhatsAppWS, useAuth, useStore, etc.
  pages/          # One file per route (grouped by domain)
  services/       # API calls (conversations.ts, whatsapp.ts, etc.)
  types/          # TypeScript types (index.ts — all types in one file)
  utils/          # Helpers
```

### Authentication

`useAuth` hook + `AuthContext`. Token stored in localStorage. Axios interceptor in `src/services/api.ts` attaches `Authorization: Token <token>` to every request. On 401, clears token and redirects to `/login`.

### API Base URL

Set via `VITE_API_URL` env var → `src/services/api.ts`. Current production backend is `https://backend.pastita.com.br` until the Cardapidex backend domain is cut over.

### WebSocket (WhatsApp real-time)

`src/hooks/useWhatsAppWS.ts` connects to the base configured by `VITE_WS_URL`, then appends `/ws/whatsapp/{accountId}/`. Handles:
- `new_message` → `onNewMessage` callback
- `message_sent` → `onMessageSent` callback (outbound/bot messages)
- `conversation_update` → `onConversationUpdate`

Used in `ChatWindow.tsx` and `WhatsAppInboxPage.tsx`.

### Message Rendering

`src/components/chat/MessageBubble.tsx` renders a single message bubble. Key components:
- `AudioPlayer` — needs `url` + `mimeType?`. Uses `<source src type={mimeType}>` inside `<audio>` for browser codec detection. Requires `crossOrigin="anonymous"` for CORS media.
- `MediaPreview` — dispatches to `AudioPlayer`, image, video, or document preview
- Media messages have `content` as a JSON **object** (e.g., `{audio: {id, mime_type}}`), not a string. Always check `typeof content === 'string'` before rendering as text.

### Critical Bug Patterns

**React error #31** — "Objects are not valid as a React child." Happens when `message.content` (which is a JSON object for media messages) is rendered directly in JSX. Always guard: `typeof message.content === 'string'`.

`previewText()` in `ConversationsPage.tsx` handles this by checking type and mapping to emoji labels (🎵 Áudio, 📷 Imagem, etc.).

## Key Pages

| Route | File | Notes |
|-------|------|-------|
| `/` | `DashboardPage` | Stats overview |
| `/conversations` | `ConversationsPage` | Universal inbox (WA + IG + Messenger) with quick modal |
| `/whatsapp/inbox` | `WhatsAppInboxPage` | Full WhatsApp chat with ChatWindow |
| `/whatsapp/chat` | `WhatsAppChatPage` | Standalone chat view |
| `/automation/*` | `automation/` folder | CompanyProfile, AutoMessages, AgentFlows, ScheduledMessages |
| `/agents/*` | `agents/` folder | LLM agent creation and testing |
| `/marketing/*` | `marketing/` folder | Email campaigns, WhatsApp campaigns |
| `/stores/*` | `stores/` folder | Store management |
| `/orders/*` | `orders/` folder | Order management |

## Services

All API calls in `src/services/`:
- `conversations.ts` — Universal conversations, WhatsApp messages, notes, handover actions
- `whatsapp.ts` — Accounts, templates, send messages
- `automation.ts` — CompanyProfile, AutoMessages, AgentFlows
- `api.ts` — Axios instance (base URL, auth interceptor, error handling)

## CORS / Media

Audio and media files are served by the backend media host. Use `crossOrigin="anonymous"` on `<audio>` / `<img>` tags for cross-origin media.

## Handover (Bot ↔ Human)

`conversationsService.switchToHuman(id)` and `switchToAuto(id)` call `POST /conversations/{id}/switch_to_human/` and `switch_to_auto/`. The backend atomically updates both `Conversation.mode` (used by bot pipeline) and `ConversationHandover.status` (used by UI). Always use these service methods, not direct handover API calls.
