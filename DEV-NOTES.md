# bat-ai-demo — Project Knowledge

## Overview
AI sales training demo for BAT (British American Tobacco).
User (hosteska) practices pitching GLO/VELO/VUSE to AI customer personas.
Architecture: Realtime + Supervisor + Scoring (three-model pattern).

## Links
- **Repo:** https://github.com/ubohub-bot/ai-convince-demo
- **Live:** https://ai-convince-demo.vercel.app
- **Admin:** https://ai-convince-demo.vercel.app/admin
- **Local path:** /tmp/ai-convince-demo

## Architecture
Three models working together:
1. **Realtime** (gpt-4o-realtime) — plays persona, Czech voice via WebRTC
2. **Supervisor** (gpt-4.1) — evaluates + steers persona via state injection
3. **Scoring** (gpt-4.1) — post-conversation evaluation

Key pattern: prompt set ONCE, state updates via `conversation.item.create` (not session.update).
Supervisor is client-side (2s debounce, 5s min interval), not a tool call.
Version: 0.3.0

## Convex
- Project: ai-convince-demo (hercklub team)
- Dev deployment: colorless-moose-743
- Prod deployment: fast-poodle-172
- Schema: `sessions` table (by_user + by_outcome indexes)
- Sessions store: transcript, moodHistory, score, debugEvents, endTrigger
- Deploy: `npx convex deploy --cmd "npm run build" --yes`

## Vercel
- Project: ai-convince-demo (lubos-projects-62fc269a)
- Env vars: OPENAI_API_KEY, NEXT_PUBLIC_CONVEX_URL
- Deploy: `vercel deploy --prod` (manual, bot can't connect GitHub)

## Character Design
- Pepík: 42yo programmer, grounded cartoony (Homer Simpson but Czech and real)
- 3-phase arc: OBRANA (deflect) → TRHLINA (crack) → ROZHODNUTÍ (decide)
- Max 10 exchanges (soft limit at 8 if stagnating), 3-5 min conversations
- Weak spot: can't play with his kids, secretly ashamed
- Czech filler words: "no...", "hele...", "ježiš...", "pff..."
- Sample phrases for every situation type
- Outcome-specific farewells: positive when converted, dismissive when rejected/walking away

## Prompt Engineering Notes
- Structured sections: Role → Personality → Speech → Flow → Rules → Tools
- Bullets > paragraphs (realtime model follows bullets better)
- Sample phrases are KING — model closely mimics style
- `language: 'cs'` on input_audio_transcription or it garbles Czech
- ALL CAPS for critical rules
- Variety rule prevents robotic loops
- Filler words make Czech speech dramatically more natural

## Conversation End Flow
Three paths to ending:
1. **Model calls `end_conversation`** — farewell is part of the same response, 5s audio buffer before disconnect
2. **Supervisor says `shouldEnd`** — state injection with 🔴 UKONČI ROZHOVOR + `response.create` forces model to respond immediately with farewell, then model calls `end_conversation`
3. **Disconnect/timeout** — safety net, 15s timeout if model ignores supervisor end instruction

Key learnings:
- Realtime model generates speech + function calls in the same response
- `response.done` fires when text/generation is complete, NOT when audio finishes playing
- Audio playback lags 3-5s behind text generation via WebRTC
- State injection (`conversation.item.create`) is passive — model only sees it on next response
- Must call `response.create` after injection to force immediate model response
- Don't `sendFunctionResult` after `end_conversation` — farewell already in current response, sending result triggers unwanted second response

## Debug & Admin
- Admin dashboard: `/admin` — session history per user
- Each session stores `debugEvents` array (supervisor evals, state injections, function calls)
- `endTrigger` field shows what ended the session: `supervisor:gave_up`, `end_conversation:converted`, `disconnect`, etc.
- Debug events panel in admin is collapsible, color-coded by event type

## Decisions & History
- 2026-02-02: Project created, all phases built in one session
- 2026-02-02: Fixed conversation ending — supervisor was killing sessions without farewell, now routes through model
- Started as architecture proof for bat-ai-voice, became standalone demo
- Chose Convex over Vercel KV for real-time queries + future extensibility
- Bot account (ubohub-bot) owns repo — can't create under hercklub org
- OpenAI lazy init needed for Vercel build (crashes without API key at build time)

## Prompt Structure (2026-02-09)

New consolidated prompts in `src/prompts/`:

```
src/prompts/
├── index.ts              # Single import
├── persona.prompt.ts     # Adam Berg persona (edit this!)
├── supervisor.prompt.ts  # Evaluates + guides
└── scoring.prompt.ts     # End-of-session report
```

### OpenAI Realtime Best Practices Applied

**Structure:**
- Role & Identity → Personality & Tone → Speech Style → Sample Phrases → Rules
- Bullets > paragraphs (model follows better)
- Sample phrases are KING (model closely mimics)
- CAPS for critical rules
- Variety rule prevents robotic loops

**Key Additions:**
- Filler words with timing guidance ("Hmm..." for thinking, "*pauza*" for weighing)
- Tool preambles (say farewell BEFORE calling end_conversation)
- Unclear audio handling ("Promiňte, to jsem neslyšel?")
- Pacing section ("Deliver fast but not rushed")
- Language pinning (VÝHRADNĚ česky)

**Supervisor Slimmed:**
- Doesn't duplicate full persona anymore
- Just references what it needs: identity, weak points, BAT experience
- State injection format simplified

**Scoring Isolated:**
- Pure prompt function + helpers
- Weights/forbidden words exported for easy tuning

## What's Next / Ideas
- Wire new prompts into existing files (replace old scattered prompts)
- Test Adam conversation with new structure
- Add more personas (different resistance types)
- Text mode for fast prompt iteration without voice
