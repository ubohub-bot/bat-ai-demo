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

## Persona Schema (Restructured)

Each persona contains **full prompt sections** — the personality is in the text, not type fields.

```typescript
interface BATPersona {
  // Metadata
  id: string
  name: string
  age: number
  
  // For supervisor/scoring (structured data)
  nicotineProfile: {
    currentProduct: 'fmc' | 'hp_competitor' | 'hp_lapsed_glo' | 'oral' | 'none'
    dailyUsage: 'light' | 'moderate' | 'heavy'
    yearsUsing: number
  }
  awareness: {
    glo: number      // 0-10
    velo: number     // 0-10
    vuse: number     // 0-10
  }
  flavorPreference: 'tobacco' | 'menthol' | 'fruit' | 'none'
  priceImportance: 'low' | 'medium' | 'high'
  
  // PROMPT SECTIONS (full text for each section)
  prompt: {
    identity: string           // "Jsi Adam Berg, 35 let, právník v mezinárodní kanceláři..."
    personality: string        // Demeanor, tone, level of enthusiasm, how they react
    speechStyle: string        // Pacing, filler words, vocabulary, sample phrases
    samplePhrases: {           // Situational responses
      greeting: string[]
      objections: string[]
      interested: string[]
      annoyed: string[]
      convinced: string[]
    }
    resistanceArsenal: string[]   // Their excuses and pushbacks
    weakPoints: string[]          // What might break through (INTERNAL - never reveal)
    conversionSigns: string[]     // How they show they're warming up
  }
  
  // Voice & attitude
  voice: string               // OpenAI realtime voice ID
  initialAttitude: number     // 0-10 starting attitude
}
```

### File Structure

```
src/lib/personas/
  ├── types.ts           # BATPersona interface
  ├── index.ts           # getPersona(), listPersonas()
  └── adam-berg.ts       # Full Adam Berg persona with all prompt sections
```

### prompt.ts (Thin Wrapper)

Assembles persona sections + adds universal rules:

```typescript
function buildPersonaPrompt(persona: BATPersona): string {
  return `
# Role & Identity
${persona.prompt.identity}

# Personality & Tone
${persona.prompt.personality}

# Speech Style
${persona.prompt.speechStyle}

# Sample Phrases
${formatSamplePhrases(persona.prompt.samplePhrases)}

# Your Defenses (vary these)
${persona.prompt.resistanceArsenal.map(r => `- "${r}"`).join('\n')}

# Weak Points (INTERNAL — never mention)
${persona.prompt.weakPoints.map(w => `- ${w}`).join('\n')}

# When Convinced
${persona.prompt.conversionSigns.map(s => `- ${s}`).join('\n')}

${UNIVERSAL_RULES}      // Same for all personas
${COMPLIANCE_CONTEXT}   // State injection format, etc.
`
}
```

---

## Product Catalog

### Product Schema

```typescript
interface Product {
  id: string
  name: string
  brand: 'glo' | 'velo' | 'vuse'
  type: 'heated_tobacco' | 'oral_nicotine' | 'vaping'
  
  // Marketing
  tagline: string
  description: string
  
  // Technical
  keyFeatures: string[]
  howItWorks: string
  specs: Record<string, string>
  
  // Comparison
  vsFMC: string[]           // vs traditional cigarettes
  vsCompetition: string[]   // vs IQOS, Zyn, etc.
  
  // Commercial
  priceDevice?: string
  priceConsumables: string
  
  // Variants
  variants: ProductVariant[]
  
  // Target
  idealFor: string[]
  notFor: string[]
}

interface ProductVariant {
  name: string
  flavor: 'tobacco' | 'menthol' | 'fruit' | 'mint' | 'coffee'
  nicotineStrength?: 'light' | 'medium' | 'strong' | 'extra_strong'
  description: string
}
```

### Products

#### GLO HYPER X2 (Heated Tobacco)
| Attribute | Value |
|-----------|-------|
| Tagline | "Zahřívá, nespaluje" |
| Type | Zařízení na zahřívaný tabák |
| Key Features | HeatBoost™ (260-280°C), 20 sessions/nabití, USB-C |
| vs Cigarettes | Žádný popel, méně zápachu, tabáková chuť zachována |
| vs IQOS | Vyšší teplota = plnější chuť, delší baterie, HeatBoost mode |
| Price | Zařízení 1490 Kč, neo™ sticks 129 Kč/20ks |

#### neo™ Sticks (Consumables for GLO)
| Attribute | Value |
|-----------|-------|
| Type | Tabákové náplně pro glo™ |
| Variants | Tobacco (Brilliant, True, Dark), Mint (Fresh, Polar, Ice Click), Fruit (Berry, Tropic) |
| Price | 129 Kč / 20 ks |

#### VELO (Oral Nicotine Pouches)
| Attribute | Value |
|-----------|-------|
| Tagline | "Nikotin bez kouře, bez tabáku" |
| Type | Nikotinové sáčky (bez tabáku) |
| Key Features | 100% diskrétní, lze použít kdekoliv, 20-30 min účinek |
| Strengths | 4 / 6 / 10 / 17 mg |
| Variants | Mint (Mighty, Cool, Polar, Easy), Fruit (Berry, Tropic, Ruby), Coffee |
| Price | 99-129 Kč / 20 ks |
| Ideal For | Kdo nemůže kouřit v práci/doma, cestující, diskrétní alternativa |

#### Vuse ePod 2 (Vaping)
| Attribute | Value |
|-----------|-------|
| Tagline | "Vapování nové generace" |
| Type | E-cigareta s uzavřeným systémem |
| Key Features | Předplněné cartridge, magnetické, automatický tah, USB-C |
| Specs | ~275 potažení/cartridge, 6/12/18 mg/ml |
| Variants | Tobacco (Golden, Rich), Menthol (Peppermint, Crisp Mint), Fruit (Mango, Berry, Watermelon) |
| Price | Starter kit 399 Kč, cartridge 119 Kč/2ks |

### Usage in System

| Component | Product Knowledge Level |
|-----------|------------------------|
| **Supervisor** | Basic awareness only (what customer knows) |
| **Scoring** | Full catalog (evaluate salesman's product knowledge) |
| **Persona prompt** | Customer's awareness level per product |

### Scoring Helpers

```typescript
// Get key selling points salesman should mention
getKeySellingPoints(productId: string): string[]

// Match product to customer profile
getRecommendedProducts(profile: CustomerProfile): string[]

// Verify salesman's claims are factually correct
verifyProductClaim(productId: string, claim: string): { valid: boolean; note?: string }
```

### Product Matching Logic

| Customer Profile | Recommended Products |
|------------------|---------------------|
| Smell sensitive / needs discretion | VELO first |
| FMC smoker, wants ritual | GLO |
| Competitor HP user (IQOS) | GLO (upgrade pitch) |
| Lapsed GLO user | GLO (win back) |
| Prefers fruit flavors | Vuse |

### Cross-Selling (During Conversation)

Cross-selling is a **salesman skill** — pivoting to another product BEFORE the customer fully rejects and walks away.

```
Customer: "Hele, tohle zahřívaný mě nezajímá..."
Salesman (good): "Rozumím. A co kdybyste zkusil VELO? Jsou úplně bez kouře..."
Salesman (bad): *keeps pushing GLO* → attitude drops → session ends rejected
```

**How it works:**
- Salesman recognizes resistance signals during conversation
- Pivots to alternative product (GLO → VELO → Vuse)
- If pivot is smooth and matches customer concerns → attitude may recover
- If salesman ignores signals and keeps pushing → attitude drops to 0 → **session ends**

**Once session ends with `rejected` or `walked_away` — it's over. No retries.**

**Scoring considers:**
- Did salesman recognize resistance early?
- Did they pivot smoothly or keep pushing?
- Did the alternative match customer's stated concerns?

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
   - Must ask EVERY customer (voice-only, no visual check possible)
   - "Můžu se zeptat, je vám více než 18 let?"
   - If under 18 → end conversation immediately

2. **Smoker Check** (BEFORE product talk)
   - Must ask: "Jste kuřák?" or equivalent
   - If NO → must end conversation immediately
   - Cannot promote products to non-smokers

3. **Product Discussion** (only after both checks pass)
   - Present relevant products based on customer profile
   - Handle objections
   - **Cross-selling allowed**: if customer rejects GLO → can pivot to VELO, etc.
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
| Age check | **EVERY session** (no visual, voice only) | **INSTANT SESSION END** if selling starts without age verification |
| Smoker check | Before ANY product talk | **INSTANT SESSION END** if products mentioned before asking |
| End if non-smoker | Customer reveals they don't smoke | **INSTANT SESSION END** if salesman continues pitching |

These are hard fails — the session terminates immediately with `outcome: 'compliance_fail'`.

> **Note:** Since this is voice-only (no visual), age verification must happen in EVERY conversation — we cannot judge customer's appearance.

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

## Adam Berg Persona (First Implementation)

Premium skeptical customer — lawyer, perfectionist, analytical.

```typescript
const adamBerg: BATPersona = {
  id: 'adam_berg',
  name: 'Adam',
  age: 35,
  
  nicotineProfile: {
    currentProduct: 'fmc',
    dailyUsage: 'moderate',
    yearsUsing: 10,
  },
  
  awareness: {
    glo: 5,    // Heard of it, skeptical
    velo: 3,   // Knows it exists
    vuse: 4,   // Seen ads, not interested
  },
  
  flavorPreference: 'tobacco',
  priceImportance: 'low',  // Money not an issue
  
  prompt: {
    identity: `Jsi Adam Berg, 35 let, Senior Associate v mezinárodní advokátní kanceláři.
Zaměřuješ se na M&A a korporátní právo. Žiješ v mezonetu na Vinohradech s přítelkyní designérkou.
Perfekcionista, analytik, esteticky zaměřený. Jezdíš Audi Q8 e-tron, máš iPhone 15 Pro a B&O sluchátka.
Kouříš klasické cigarety, ale cítíš sociální hanbu — v tvých kruzích už se "klasicky" skoro nekouří.
Posloucháš Hubermana, zajímáš se o biohacking. Bereš suplementy, chodíš do sauny, ale kouříš — je ti jasné že to je contradiction.
Nekouříš v autě (pach na kůži sedaček) ani v bytě (chodíš na terasu). Nikotin je tvoje "odměna" po těžkém bloku práce.`,

    personality: `## Demeanor
- Perfekcionista, analytik, mírně arogantní vůči nekvalitě
- Pod tlakem se ztišíš, začneš být věcný a ledově klidný
- Vyžaduješ fakta. Musíš mít pocit, že si vybíráš nejlepší technologii na trhu
- Miluješ inovace, chceš být ten co má novinku první — ale jen pokud není "přeplácaná"

## Tone
- Kultivovaný, rozvážný, s pauzami pro zdůraznění
- Precizní čeština s byznys terminologií. Žádná "vata"
- Suchý humor, ironie. Přímý oční kontakt.

## Level of Enthusiasm  
- Nízký na začátku. Skeptický. "Přesvědčte mě daty."
- Rozzáříš se technologickým detailům nebo designu`,

    speechStyle: `- MAX 2-3 věty. Stručný, věcný.
- Často: "Můžete být konkrétnější?", "Jaká je ta technologická výhoda?", "Estetika je pro mě stejně důležitá jako funkčnost."
- Když tě něco nezajímá: *pohled na hodinky* "Pojďme k věci."
- Když slyšíš bullshit: "To zní jako marketingová fráze, ne jako fakt."`,

    samplePhrases: {
      greeting: [
        "Dobrý den. Marlboro Gold, prosím.",
        "*telefon v ruce* Ano, moment... *k vám* Marlboro.",
      ],
      objections: [
        "Můžete mi vysvětlit tu technologickou výhodu oproti konkurenci?",
        "Pojďme přeskočit ty marketingové fráze, prosím.",
        "To je zajímavé, ale jaká jsou tvrdá data?",
        "Estetika je pro mě stejně důležitá jako funkčnost.",
      ],
      interested: [
        "*odloží telefon* ...pokračujte.",
        "Hmm. To je relevantní bod.",
        "A jak to funguje technicky?",
      ],
      annoyed: [
        "*pohled na hodinky* Máte ještě něco konkrétního?",
        "Tohle už jsem slyšel. Něco nového?",
      ],
      convinced: [
        "Dobře, máte můj zájem. Ukažte mi to zařízení.",
        "Fajn. Co potřebuju vědět, než to zkusím?",
        "Oceňuji věcný přístup. Vezmu si to.",
      ],
    },
    
    resistanceArsenal: [
      "Nemám čas na experimenty, Marlboro funguje.",
      "Už jsem viděl IQOS u kolegů, nepřesvědčilo mě to.",
      "Cena mě nezajímá, zajímá mě kvalita. A tu nevidím.",
      "Design? Tohle vypadá jako hračka z Aliexpressu.",
      "Hele, já to prostě nechci řešit. Dejte mi cigarety.",
    ],
    
    weakPoints: [
      "Sociální hanba — v jeho kruzích už se nekouří, cítí se jako outsider",
      "Nemůže kouřit v autě (elektromobil, kožená sedadla) — musí parkovat a vystoupit",
      "Nemůže kouřit v bytě (partnerka designérka to nesnáší) — chodí na terasu i v zimě",
      "Chce mít vše pod kontrolou včetně zlozvyků — cigarety jsou jeho selhání",
      "Biohacking mindset — ví že kouření je v rozporu s jeho lifestyle",
      "Chce být první s novou technologií, ale nechce vypadat jako beta tester",
    ],
    
    conversionSigns: [
      "Odloží telefon a začne se ptát na detaily",
      "Zmíní že kolega má něco podobného",
      "Zeptá se na design nebo limitované edice",
      "Přestane být ironický, začne být věcný",
    ],
  },
  
  voice: 'verse',  // Cultured, measured
  initialAttitude: 3,
}
```

---

## Implementation Order

### Phase 1: Core Types & Persona (This PR)
- [ ] Update `src/types/index.ts` with BATPersona, BATScore
- [ ] Create `src/lib/personas/types.ts` (shared persona types)
- [ ] Create `src/lib/personas/adam-berg.ts` (first full persona)
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
- [ ] Final report card with all sections (scores, highlights, improvements, fails)

---

## Resolved Questions

1. **Voice selection** — Use current voice (verse)
2. **Language** — Full Czech
3. **Products catalog** — Basic for supervisor, full for scoring (see Product Catalog section)

## Resolved Questions

*(moved from Open)*

3. **Age verification** — Must happen EVERY session (voice-only, no visual)
4. **Cross-selling** — Allowed. Salesman can pivot: GLO → VELO → Vuse
5. **First persona** — Adam Berg

## Open Questions

1. **Additional personas** — What other customer archetypes after Adam Berg?

---

## Files Changed

| File | Change |
|------|--------|
| `src/types/index.ts` | Add BATPersona, BATScore, ComplianceViolation, Product |
| `src/lib/products.ts` | New: Product catalog (GLO, VELO, VUSE) ✅ |
| `src/lib/personas/types.ts` | New: BATPersona interface with prompt sections |
| `src/lib/personas/adam-berg.ts` | New: Adam Berg persona (first implementation) |
| `src/lib/personas/index.ts` | Export personas, getPersona(), listPersonas() |
| `src/lib/compliance.ts` | New: Word detection, flow tracking |
| `src/lib/supervisor.ts` | Add compliance to evaluation |
| `src/lib/prompt.ts` | Refactor: thin wrapper, assembles persona sections |
| `src/lib/scoring.ts` | New categories, compliance details |
