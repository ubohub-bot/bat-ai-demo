# BAT Sales Training Demo — Specification

> **Goal:** Train salespeople to sell BAT nicotine products (GLO, Velo, Vuse) in tobacco shop scenarios.

## Architecture (Preserved from ai-convince-demo)

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Realtime Voice │◄───►│  Supervisor  │────►│  Scoring    │
│  (Customer AI)  │     │  (Whisper)   │     │  (Report)   │
└────────┬────────┘     └──────────────┘     └─────────────┘
         │                     │
         ▼                     ▼
   State Injection      Attitude Meter
   (hidden guidance)       (0-10)
```

**What stays the same:**
- Realtime voice model plays the customer persona
- Supervisor injects hidden state blocks between exchanges
- Attitude meter (0-10) drives conversation flow
- Post-conversation scoring with highlights/improvements

**What changes:**
- Personas: tobacco shop customers instead of health coaching
- Compliance engine: forbidden words, age verification, smoker check
- Scoring categories: relationship, needs discovery, product presentation, compliance

---

## Customer Types

| Type | Description | Initial Attitude | Difficulty |
|------|-------------|------------------|------------|
| Ideal | Open to trying new products | 5 | Easy |
| Busy | In a hurry, impatient | 2 | Medium |
| Skeptical | Doubts product claims | 2 | Hard |
| Price-Sensitive | Only cares about cost | 3 | Medium |

---

## Persona Schema (Extended)

```typescript
interface BATPersona extends Persona {
  // Customer type
  customerType: 'ideal' | 'busy' | 'skeptical' | 'price_sensitive'
  
  // Current nicotine habits
  nicotineProfile: {
    currentProduct: 'fmc' | 'hp_competitor' | 'hp_lapsed_glo' | 'oral' | 'none'
    dailyUsage: 'light' | 'moderate' | 'heavy'
    yearsUsing: number
  }
  
  // Product awareness (0-10)
  awareness: {
    glo: number      // Heated tobacco
    velo: number     // Oral nicotine
    vuse: number     // Vaping/RCS
  }
  
  // Preferences
  flavorPreference: 'tobacco' | 'menthol' | 'fruit' | 'none'
  priceImportance: 'low' | 'medium' | 'high'
  
  // Persona details (from original)
  name: string
  age: number
  background: string
  traits: string[]
  resistancePoints: string[]
  weakPoints: string[]
  voice: string
  speechStyle: string
  initialAttitude: number
}
```

---

## Conversation Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   OPENING   │────►│   DEFENSE   │────►│   CLOSING   │
│  (1-2 turns)│     │ (3-6 turns) │     │ (1-2 turns) │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  Age check?          Product talk         End reason:
  Smoker check?       Objections           - converted
                      Attitude shifts      - rejected
                                          - walked_away
```

### Mandatory Flow (Compliance)

1. **Age Verification** (BEFORE product talk)
   - If customer looks 18-25 → must ask for ID
   - If under 18 → end conversation immediately

2. **Smoker Check** (BEFORE product talk)
   - Must ask: "Jste kuřák?" or equivalent
   - If NO → must end conversation immediately
   - Cannot promote products to non-smokers

3. **Product Discussion** (only after smoker check passes)
   - Present relevant products based on customer profile
   - Handle objections
   - Work toward closing

---

## Compliance Rules (Tracked on SALESMAN)

The salesman (user) is being evaluated on these rules. The AI customer doesn't enforce them — the **scoring system** does.

### Forbidden Words/Phrases
| ❌ Wrong | ✅ Correct | Context |
|----------|-----------|---------|
| "kouřit GLO" | "užívat GLO" | GLO is "used", not "smoked" |
| "zdarma" | "bez poplatku" / "v ceně" | Word "free" is forbidden |
| "zdravější" | "méně škodlivé" | Cannot claim health benefits |

### Required Actions (INSTANT END triggers)
| Action | When | Consequence if Missed |
|--------|------|----------------------|
| Age check | Customer looks <25 | **INSTANT SESSION END** if selling starts without ID check |
| Smoker check | Before ANY product talk | **INSTANT SESSION END** if products mentioned before asking |
| End if non-smoker | Customer reveals they don't smoke | **INSTANT SESSION END** if salesman continues pitching |

These are hard fails — the session terminates immediately with `outcome: 'compliance_fail'`.

### How It Works

1. **Supervisor** watches salesman's messages in real-time
2. **Compliance engine** flags violations (stored in session state)
3. **AI customer** may react if violation affects conversation ("Já nekouřím...")
4. **Final score** reflects all violations in the compliance category

### Word Detection

```typescript
interface ComplianceViolation {
  word: string
  context: string        // surrounding text
  severity: 'warning' | 'violation'
  timestamp: number
}

const FORBIDDEN_WORDS = [
  { pattern: /kouř\w*\s+glo/i, message: 'GLO se "užívá", ne "kouří"' },
  { pattern: /\bzdarma\b/i, message: 'Slovo "zdarma" je zakázáno' },
  { pattern: /\bzdrav\w+/i, message: 'Nelze tvrdit zdravotní benefity', severity: 'warning' },
]
```

---

## Attitude System

Same as original (0-10), but with BAT-specific triggers:

### Attitude Increase (+)
| Action | Impact |
|--------|--------|
| Empathy, active listening | +0.5 to +1 |
| Relevant product match | +1 to +2 |
| Addressing specific concerns | +1 |
| Good flavor/price match | +1 |
| **Pushing past objections** ("nevím", "nezajímá mě") | +1 (bonus for persistence) |

### Attitude Decrease (-)
| Action | Impact |
|--------|--------|
| Pushing wrong product | -1 |
| Ignoring objections | -1 to -2 |
| Being pushy/aggressive | -2 to -3 |
| Compliance violation (forbidden word) | -1 |

### Session End Conditions
- **Converted**: Attitude reaches 8+ and customer agrees
- **Attitude zero**: Attitude drops to 0 → session ends (customer walks away)
- **Compliance fail**: Instant end triggers (see above)

---

## Scoring System

### Categories (Post-Conversation) — Scale 0-10

| Category | Weight | Description |
|----------|--------|-------------|
| Budování vztahu | 25% | Relationship building, rapport (0-10) |
| Zjišťování potřeb | 30% | Needs discovery quality (0-10) |
| Prezentace produktů | 25% | Product presentation skill (0-10) |
| Soulad s pravidly | 20% | Compliance (0-10) |

**Overall score** = weighted average, also 0-10

### Compliance Scoring Details (0-10)

```
10: Perfect compliance — all checks done, no violations
 8: Minor issue (e.g., slightly late age check)
 5: One forbidden word used (e.g., "zdarma")
 0: Critical failure — skipped smoker check, sold to non-smoker, no age check
```

### Persistence Bonus

When customer says "nevím", "nechci", "nezajímá mě to" and salesman pushes through skillfully (not aggressively), award bonus points to Zjišťování potřeb category.

### Report Output

```typescript
interface BATScore {
  overall: number  // 0-10 (weighted average)
  categories: {
    relationship: number      // Budování vztahu (0-10)
    needsDiscovery: number    // Zjišťování potřeb (0-10)
    productPresentation: number // Prezentace produktů (0-10)
    compliance: number        // Soulad s pravidly (0-10)
  }
  
  complianceDetails: {
    ageVerification: 'passed' | 'skipped' | 'failed' | 'not_required'
    smokerCheck: 'passed' | 'skipped' | 'failed'
    forbiddenWords: ComplianceViolation[]
  }
  
  highlights: string[]    // What went well
  improvements: string[]  // What to improve
  fails: string[]         // Critical failures
  
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
}
```

---

## Supervisor Adaptations

### Who Is Who
- **AI (Realtime Voice)** = Customer persona (busy shopper, skeptic, etc.)
- **User (Human Trainee)** = Salesman practicing their pitch
- **Supervisor** = Watches the salesman, guides the AI customer's reactions

### Compliance Tracking (Watches the SALESMAN)

The supervisor monitors the **user's messages** for:
1. Age verification — did they ask for ID if customer looks young?
2. Smoker check — did they ask "Jste kuřák?" before talking products?
3. Forbidden words — did they say "kouřit GLO", "zdarma", etc.?
4. Flow violations — did they pitch products before confirming smoker?

### State Injection Block (Czech)

Tells the AI customer how to behave based on salesman's performance:

```
===== STAV ROZHOVORU =====
NÁLADA: 4/10 (klesá)
FÁZE: DEFENSE  
POKYN: Prodavač je příliš agresivní. Buď netrpělivý, naznač že spěcháš.
COMPLIANCE: ⚠️ Prodavač se nezeptal jestli kouříš — pokud zmíní produkty, buď zmatený ("Ale já nekouřím...?")
TÉMATA: cena, čas
=============================
```

### Customer Reactions to Compliance Failures

| Salesman Violation | Customer Reaction |
|--------------------|-------------------|
| Skipped smoker check, started pitching | "Počkejte, já ani nekouřím..." (confused) |
| Used "zdarma" | No reaction (customer doesn't know rules) |
| Too pushy | "Hele, já fakt spěchám..." (defensive) |
| Good rapport, asks about needs | Opens up, attitude rises |

### Supervisor Prompt Additions

The supervisor evaluates the **salesman's performance**:
1. Did they build rapport before pitching?
2. Did they ask discovery questions (smoking habits, preferences)?
3. Did they match product to customer needs?
4. Did they follow compliance rules?

Then guides the AI customer to react realistically.

---

## Busy Customer Persona (First Implementation)

```typescript
const busyCustomer: BATPersona = {
  id: 'busy_customer',
  customerType: 'busy',
  
  name: 'Martin',
  age: 35,
  
  background: `Martin Dvořák, 35 let, manažer v IT firmě.
Vždy ve spěchu, telefon v ruce, neustále kontroluje čas.
Kouří klasické cigarety (Marlboro), krabičku za dva dny.
Slyšel o zahřívaném tabáku, ale "nemá čas to zkoumat".
Vstoupil do trafiky pro krabičku cigaret, žádný jiný plán.`,

  nicotineProfile: {
    currentProduct: 'fmc',
    dailyUsage: 'moderate',
    yearsUsing: 12,
  },
  
  awareness: {
    glo: 3,    // Heard of it
    velo: 1,   // Barely knows
    vuse: 2,   // Seen ads
  },
  
  flavorPreference: 'tobacco',
  priceImportance: 'medium',
  
  traits: [
    'netrpělivý',
    'pragmatický',
    'nemá čas na řeči',
    've stresu',
    'rozhoduje se rychle',
  ],
  
  resistancePoints: [
    'Nemám čas, spěchám do práce',
    'Dejte mi prostě Marlboro',
    'Tohle není pro mě',
    'Kolik to stojí? Tolik?',
    'Musím jít, sorry',
  ],
  
  weakPoints: [
    'Manželka mu nadává za zápach z kouření',
    'V kanceláři nemůže kouřit — musí ven',
    'Děti se ho ptají proč smrdí',
    'Uvědomuje si že cigarety jsou drahé',
  ],
  
  speechStyle: `Krátké, úsečné odpovědi. Často kontroluje hodinky.
Přerušuje, když se mu něco zdá irelevantní.
Mluví rychle. Netrpí zbytečné řeči.`,

  voice: 'ash',  // Quick, businesslike
  initialAttitude: 2,
}
```

---

## Implementation Order

### Phase 1: Core Types & Persona (This PR)
- [ ] Update `src/types/index.ts` with BATPersona, BATScore
- [ ] Create `src/lib/personas/busy.ts`
- [ ] Create `src/lib/compliance.ts` (word detection, flow tracking)

### Phase 2: Supervisor Adaptation
- [ ] Update `src/lib/supervisor.ts` for BAT context
- [ ] Add compliance tracking to evaluation
- [ ] Update state injection format

### Phase 3: Prompt Refactor
- [ ] Update `src/lib/prompt.ts` for tobacco shop context
- [ ] Add compliance rules to persona prompt
- [ ] Add flow enforcement (age check, smoker check)

### Phase 4: Scoring
- [ ] Update `src/lib/scoring.ts` with new categories
- [ ] Add compliance details to report
- [ ] Add "fails" section for critical violations

### Phase 5: UI Updates
- [ ] Attitude meter visualization
- [ ] Compliance warnings display
- [ ] Final report card with all sections

---

## Open Questions

1. **Voice selection** — Which OpenAI voices for each persona type?
2. **Language** — Full Czech or Czech/English hybrid?
3. **Products catalog** — Do we need detailed product specs in prompts?
4. **Multiple products** — Should we support scenarios for GLO vs Velo vs Vuse?

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add BATPersona, BATScore, ComplianceViolation |
| `src/lib/personas/busy.ts` | New: Busy Customer persona |
| `src/lib/personas/index.ts` | Export busy customer |
| `src/lib/compliance.ts` | New: Word detection, flow tracking |
| `src/lib/supervisor.ts` | Add compliance to evaluation |
| `src/lib/prompt.ts` | Refactor for tobacco shop context |
| `src/lib/scoring.ts` | New categories, compliance details |
