/**
 * SCORING PROMPT
 * 
 * Evaluates the complete training session.
 * Called once at the end to generate the report card.
 * 
 * Categories (weights):
 * - relationship: 25%
 * - needsDiscovery: 30%
 * - productPresentation: 25%
 * - compliance: 20%
 */

export const SCORING_WEIGHTS = {
  relationship: 0.25,
  needsDiscovery: 0.30,
  productPresentation: 0.25,
  compliance: 0.20,
}

export const FORBIDDEN_WORDS = [
  'zdarma',        // → "bez poplatku" / "v ceně"
  'kouřit glo',    // → "užívat GLO"
  'kouřit GLO',
  'zdravější',     // → "méně škodlivé"
]

export interface ScoringInput {
  transcript: string
  personaName: string
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
  detectedForbiddenWords: string[]
}

export function buildScoringPrompt(input: ScoringInput): string {
  const { transcript, personaName, outcome, detectedForbiddenWords } = input

  const outcomeText = {
    converted: 'Úspěch — zákazník projevil zájem / koupil',
    rejected: 'Odmítnuto — zákazník odmítl nabídku',
    walked_away: 'Odešel — zákazník ukončil konverzaci',
    compliance_fail: 'Porušení pravidel — kritická compliance chyba',
  }[outcome]

  return `
Jsi hodnotitel tréninku pro BAT (British American Tobacco). Hodnotíš výkon hostesky.

# Kontext
- **Hosteska** (user) = trenuje prodejní dovednosti pro BAT produkty
- **Zákazník** (${personaName}) = persona v trafice
- **Scénář**: Zákazník přišel koupit cigarety, hosteska nabídla alternativy

# Výsledek: ${outcomeText}

# Přepis
${transcript}

---

# Compliance pravidla

## Povinné kroky:
1. **Věková verifikace** — PŘED mluvením o produktech
2. **Kontrola kuřáka** — PŘED nabízením produktů

## Zakázaná slova:
- "zdarma" → říkat "bez poplatku" / "v ceně"
- "kouřit GLO" → říkat "užívat GLO"
- "zdravější" → říkat "méně škodlivé"

## Nalezená zakázaná slova:
${detectedForbiddenWords.length > 0 ? detectedForbiddenWords.join(', ') : 'Žádná'}

---

# Hodnocení kategorií (0-10)

## 1. Budování vztahu (relationship) — 25%
- Navázala kontakt přirozeně?
- Byla přátelská, ne agresivní?
- Projevila zájem o zákazníka jako člověka?

## 2. Zjišťování potřeb (needsDiscovery) — 30%
- Ptala se na kuřácké návyky?
- Zjistila preference (chuť, síla, místo kouření)?
- Naslouchala odpovědím?
- **BONUS za vytrvalost**: Elegantně překonala "nevím/nechci" (+1-2)
- **BONUS za slabá místa**: Identifikovala bolesti (auto, kancelář, hanba) (+1-2)

## 3. Prezentace produktů (productPresentation) — 25%
- Představila relevantní produkty na základě potřeb?
- Zmínila konkrétní výhody (ne generic)?
- Uměla odpovědět na námitky?
- Nabídla alternativu když jeden produkt nezabral?

## 4. Soulad s pravidly (compliance) — 20%
- 10 = Perfektní: věk + kuřák + žádná zakázaná slova
- 8 = Drobné nedostatky: mírně opožděná kontrola, 1 zakázané slovo
- 5 = Více chyb: několik zakázaných slov, špatné pořadí
- 0 = Kritické selhání: chybí ověření věku, nabízení nekuřákovi

---

# Hodnocení fází

## SKEPSE (výměny 1-3)
- Prorazila skepsi fakty a argumenty?
- Nebo jen opakovala fráze?

## ZÁJEM (výměny 3-5)
- Rozpoznala signály zájmu?
- Využila slabá místa zákazníka?

## ROZHODNUTÍ (výměny 6-8)
- Pomohla k rozhodnutí?
- Nabídla konkrétní akci?
- Netlačila zbytečně?

---

# Věková verifikace
- 'passed' = Zeptala se PŘED produkty
- 'skipped' = Nezeptala se
- 'failed' = Nabízela nezletilému

# Kontrola kuřáka
- 'passed' = Zeptala se PŘED nabídkou
- 'skipped' = Nezeptala se, rovnou nabízela
- 'failed' = Pokračovala i když řekl že nekouří

---

Vrať POUZE validní JSON (bez markdown):

{
  "categories": {
    "relationship": <0-10>,
    "needsDiscovery": <0-10>,
    "productPresentation": <0-10>,
    "compliance": <0-10>
  },
  "complianceDetails": {
    "ageVerification": "<passed|skipped|failed>",
    "smokerCheck": "<passed|skipped|failed>"
  },
  "phaseHandling": {
    "skepseBreakthrough": <true pokud prorazila fakty, false pokud jen frázovala>,
    "interestRecognized": <true pokud rozpoznala a využila zájem>,
    "weakPointsUsed": ["<seznam slabých míst: 'auto', 'kancelář', 'partnerka'>"],
    "decisionHelped": <true pokud pomohla k rozhodnutí>
  },
  "highlights": ["<2-3 věci co udělala dobře, ČESKY>"],
  "improvements": ["<2-3 věci co zlepšit, ČESKY>"],
  "fails": ["<kritické chyby, ČESKY, prázdné pokud žádné>"]
}
`.trim()
}

/**
 * Calculate overall score from categories
 */
export function calculateOverallScore(categories: {
  relationship: number
  needsDiscovery: number
  productPresentation: number
  compliance: number
}): number {
  const overall =
    categories.relationship * SCORING_WEIGHTS.relationship +
    categories.needsDiscovery * SCORING_WEIGHTS.needsDiscovery +
    categories.productPresentation * SCORING_WEIGHTS.productPresentation +
    categories.compliance * SCORING_WEIGHTS.compliance

  return Math.round(overall * 10) / 10
}

/**
 * Detect forbidden words in hosteska messages
 */
export function detectForbiddenWords(hosteskaMessages: string[]): string[] {
  const text = hosteskaMessages.join(' ').toLowerCase()
  return FORBIDDEN_WORDS.filter(word => text.includes(word.toLowerCase()))
}
