# 🎯 AI Convince Demo

Proof-of-concept for the **Realtime Agent + Supervisor + Scoring** architecture.

Talk to a stubborn Czech AI character via voice and try to convince them to change their lifestyle. The AI responds naturally in real-time, while a supervisor model monitors the conversation and steers the persona.

**Live:** https://ai-convince-demo.vercel.app  
**Admin:** https://ai-convince-demo.vercel.app/admin

## Architecture

```
┌─────────────┐     WebRTC      ┌─────────────────────┐
│   Browser    │ ◄─────────────► │  OpenAI Realtime API │
│  (user mic)  │    voice i/o    │  gpt-4o-realtime     │
└──────┬───────┘                 └─────────────────────┘
       │                                    ▲
       │ after each exchange                │ conversation.item.create
       │ (2s debounce, 5s min)              │ (passive state injection)
       ▼                                    │
┌──────────────┐                 ┌──────────┴──────────┐
│  /api/       │ ───────────────►│  Supervisor Model    │
│  supervisor  │    transcript   │  gpt-4.1             │
└──────────────┘    + mood hist  └─────────────────────┘
       │
       │ on conversation end
       ▼
┌──────────────┐                 ┌─────────────────────┐
│  /api/score  │ ───────────────►│  Scoring Model       │
└──────────────┘    transcript   │  gpt-4.1             │
       │                         └─────────────────────┘
       │ save results
       ▼
┌──────────────┐
│   Convex DB  │
│  sessions    │
└──────────────┘
```

### Three Models

| Model | Role | Purpose |
|-------|------|---------|
| **gpt-4o-realtime** | Persona | Plays the character, responds in Czech voice via WebRTC |
| **gpt-4.1** (Supervisor) | Director | Evaluates conversation in real-time, steers persona via state injection |
| **gpt-4.1** (Scoring) | Judge | Post-conversation scoring across 4 categories |

### How the Supervisor Works

1. User speaks → persona responds via Realtime API
2. Client waits 2s debounce (min 5s between calls)
3. Client sends transcript + mood history to `POST /api/supervisor`
4. Supervisor evaluates: attitude, direction, guidance, topics
5. Client injects state into realtime via `conversation.item.create` (passive, no `response.create`)
6. Persona follows injected guidance in next natural response

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── session/route.ts     # Create realtime session (ephemeral token)
│   │   ├── supervisor/route.ts  # Evaluate conversation state
│   │   └── score/route.ts       # Score completed session
│   ├── admin/page.tsx           # Admin dashboard — session history
│   ├── page.tsx                 # Main UI — login, voice, scoring
│   ├── providers.tsx            # Convex provider
│   └── layout.tsx
├── lib/
│   ├── personas/                # Character definitions
│   ├── realtime/
│   │   ├── client.ts            # WebRTC client
│   │   ├── events.ts            # Realtime event types
│   │   └── useSession.ts        # React hook — session lifecycle
│   ├── openai.ts                # OpenAI client + token generation
│   ├── prompt.ts                # Persona prompt builder
│   ├── supervisor.ts            # Evaluation + state injection
│   └── scoring.ts               # Post-conversation scoring
├── types/index.ts
convex/
├── schema.ts                    # sessions table
├── sessions.ts                  # save, getByUser, listAll, listUsers
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **OpenAI Realtime API** (WebRTC)
- **OpenAI gpt-4.1** (Supervisor + Scoring)
- **Convex** (session storage)
- **Vercel** (hosting)

## Setup

```bash
# Install
npm install

# Environment
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local

# Convex (separate terminal)
npx convex dev

# Dev server
npm run dev
```

## Deploy

```bash
# Convex → production
npx convex deploy --cmd "echo done" --yes

# Vercel
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_CONVEX_URL production
vercel deploy --prod
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key with Realtime access |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL |

## Debug Mode

Click **🐛 Debug** (bottom-right) during a session to see supervisor evaluations, state injections, and mood history in real-time.
