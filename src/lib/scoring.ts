import { TranscriptMessage, BATPersona, BATScore } from '@/types'
import { getOpenAI, MODELS } from './openai'

// Forbidden words/phrases that hosteska should not use
const FORBIDDEN_WORDS = [
  'zdarma',
  'kouřit glo',
  'kouřit GLO',
  'zdravější',
]

// Category weights for overall score calculation
const WEIGHTS = {
  relationship: 0.25,       // 25%
  needsDiscovery: 0.30,     // 30%
  productPresentation: 0.25, // 25%
  compliance: 0.20,         // 20%
}

/**
 * Score a completed BAT training session.
 * Evaluates hosteska performance across 4 categories with compliance tracking.
 */
export async function scoreSession(
  transcript: TranscriptMessage[],
  persona: BATPersona,
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
): Promise<BATScore> {
  const transcriptText = transcript
    .map(
      (m) =>
        `[${m.role === 'user' ? 'Hosteska' : persona.name}]: ${m.content}`
    )
    .join('\n')

  // Pre-scan for forbidden words in hosteska's messages
  const hosteskaMessages = transcript
    .filter((m) => m.role === 'user')
    .map((m) => m.content.toLowerCase())
    .join(' ')

  const detectedForbiddenWords: string[] = []
  for (const word of FORBIDDEN_WORDS) {
    if (hosteskaMessages.includes(word.toLowerCase())) {
      detectedForbiddenWords.push(word)
    }
  }

  const prompt = `Jsi hodnotitel tréninku pro BAT (British American Tobacco). Hodnotíš výkon hostesky (promotérky), která oslovila zákazníka "${persona.name}" v trafice.

## Kontext
- **Hosteska** (user) = trenuje prodejní dovednosti pro BAT produkty (GLO, VELO, Vuse)
- **Zákazník** (${persona.name}) = persona zákazníka v trafice
- **Scénář**: Zákazník přišel koupit cigarety, hosteska ho oslovila a nabídla alternativy

## Výsledek konverzace: ${outcomeToText(outcome)}

## Přepis konverzace
${transcriptText}

## Pravidla pro compliance (soulad s pravidly)
1. **Věková verifikace**: Hosteska MUSÍ zjistit věk zákazníka PŘED mluvením o produktech (voice-only demo, nelze vidět)
2. **Kontrola kuřáka**: Hosteska MUSÍ zjistit, zda zákazník kouří PŘED nabízením produktů
3. **Zakázaná slova**: "zdarma" (říkat "bez poplatku"/"v ceně"), "kouřit GLO" (říkat "užívat GLO"), "zdravější" (říkat "méně škodlivé")

## Nalezená zakázaná slova v přepisu
${detectedForbiddenWords.length > 0 ? detectedForbiddenWords.join(', ') : 'Žádná'}

## Hodnocení kategorií (0-10)

### 1. Budování vztahu (relationship) - váha 25%
- Navázala hosteska kontakt přirozeně?
- Byla přátelská, ne agresivní?
- Projevila zájem o zákazníka jako člověka?
- Vytvořila příjemnou atmosféru?

### 2. Zjišťování potřeb (needsDiscovery) - váha 30%
- Ptala se na kuřácké návyky?
- Zjistila preference (chuť, síla, místo kouření)?
- Naslouchala odpovědím?
- **BONUS za vytrvalost**: Pokud zákazník řekl "nevím", "nechci", "nezajímá mě to" a hosteska to zvládla elegantně překonat (ne agresivně), přidej +1-2 body

### 3. Prezentace produktů (productPresentation) - váha 25%
- Představila relevantní produkty na základě zjištěných potřeb?
- Zmínila konkrétní výhody (ne generic fráze)?
- Uměla odpovědět na námitky?
- Nabídla alternativu když jeden produkt nezabral?

### 4. Soulad s pravidly (compliance) - váha 20%
- 10 = Perfektní: ověření věku + kontrola kuřáka + žádná zakázaná slova
- 8 = Drobné nedostatky: mírně opožděná kontrola, nebo 1 zakázané slovo
- 5 = Více chyb: několik zakázaných slov, špatné pořadí
- 0 = Kritické selhání: chybí ověření věku, nabízení produktů nekuřákovi

## Hodnocení věkové verifikace
- 'passed' = Hosteska se zeptala na věk PŘED mluvením o produktech
- 'skipped' = Hosteska se na věk vůbec nezeptala
- 'failed' = Hosteska začala nabízet produkty nezletilému (pokud to vyplynulo z konverzace)

## Hodnocení kontroly kuřáka
- 'passed' = Hosteska se zeptala jestli zákazník kouří PŘED nabídkou
- 'skipped' = Hosteska se nezeptala a rovnou nabízela
- 'failed' = Hosteska pokračovala v nabídce i když zákazník řekl že nekouří

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
  "highlights": ["<2-3 věci co hosteska udělala dobře, ČESKY>"],
  "improvements": ["<2-3 věci co zlepšit, ČESKY>"],
  "fails": ["<kritické chyby pokud nějaké, ČESKY, prázdné pole pokud žádné>"]
}`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODELS.SCORING,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallbackScore(outcome, detectedForbiddenWords)

    const parsed = JSON.parse(content)

    // Calculate weighted overall score
    const categories = {
      relationship: clamp(parsed.categories?.relationship),
      needsDiscovery: clamp(parsed.categories?.needsDiscovery),
      productPresentation: clamp(parsed.categories?.productPresentation),
      compliance: clamp(parsed.categories?.compliance),
    }

    const overall =
      categories.relationship * WEIGHTS.relationship +
      categories.needsDiscovery * WEIGHTS.needsDiscovery +
      categories.productPresentation * WEIGHTS.productPresentation +
      categories.compliance * WEIGHTS.compliance

    return {
      overall: Math.round(overall * 10) / 10, // Round to 1 decimal
      categories,
      complianceDetails: {
        ageVerification: parseComplianceStatus(parsed.complianceDetails?.ageVerification),
        smokerCheck: parseComplianceStatus(parsed.complianceDetails?.smokerCheck),
        forbiddenWords: detectedForbiddenWords,
      },
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      fails: Array.isArray(parsed.fails) ? parsed.fails : [],
      outcome,
    }
  } catch (error) {
    console.error('Scoring error:', error)
    return fallbackScore(outcome, detectedForbiddenWords)
  }
}

function clamp(value: unknown): number {
  const num = typeof value === 'number' ? value : 5
  return Math.max(0, Math.min(10, Math.round(num)))
}

function parseComplianceStatus(
  value: unknown
): 'passed' | 'skipped' | 'failed' {
  if (value === 'passed' || value === 'skipped' || value === 'failed') {
    return value
  }
  return 'skipped'
}

function outcomeToText(
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
): string {
  switch (outcome) {
    case 'converted':
      return 'Úspěch - zákazník projevil zájem / koupil'
    case 'rejected':
      return 'Odmítnuto - zákazník odmítl nabídku'
    case 'walked_away':
      return 'Odešel - zákazník ukončil konverzaci'
    case 'compliance_fail':
      return 'Porušení pravidel - kritická compliance chyba'
  }
}

function fallbackScore(
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail',
  forbiddenWords: string[]
): BATScore {
  return {
    overall: 5,
    categories: {
      relationship: 5,
      needsDiscovery: 5,
      productPresentation: 5,
      compliance: 5,
    },
    complianceDetails: {
      ageVerification: 'skipped',
      smokerCheck: 'skipped',
      forbiddenWords,
    },
    highlights: [],
    improvements: ['Hodnocení nebylo k dispozici.'],
    fails: [],
    outcome,
  }
}
