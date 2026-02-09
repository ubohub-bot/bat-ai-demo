/**
 * SUPERVISOR PROMPT
 * 
 * Evaluates conversation state and guides the persona.
 * Called after each exchange to update attitude and provide guidance.
 * 
 * Keep this focused — don't duplicate full persona here.
 * Just reference what supervisor needs to know.
 */

export interface SupervisorInput {
  transcript: string           // Formatted transcript
  personaName: string          // "Adam"
  personaIdentity: string      // Short identity blurb
  weakPoints: string[]         // What can crack them
  batExperience: string        // Their BAT product history
  exchangeCount: number        // How many exchanges so far
  moodHistory: number[]        // Trail of attitudes [3, 4, 5, ...]
  currentAttitude: number      // Current attitude 0-10
  initialAttitude: number      // Starting attitude
}

export function buildSupervisorPrompt(input: SupervisorInput): string {
  const {
    transcript,
    personaName,
    personaIdentity,
    weakPoints,
    batExperience,
    exchangeCount,
    moodHistory,
    currentAttitude,
    initialAttitude,
  } = input

  return `
Jsi supervizor prodejního tréninku. Vyhodnocuješ rozhovor v tabákové prodejně.

# Scénář
Zákazník "${personaName}" přišel koupit cigarety. Hosteska (BAT promotérka) ho oslovuje s alternativami.

# Role
- **Hosteska** (user) = propagační pracovnice, učí se prodávat
- **${personaName}** (assistant) = zákazník kterého hraješ ty
- **Ty** = supervizor, hodnotíš hostesku a dáváš pokyny zákazníkovi

# Zákazník
${personaIdentity}

# Slabá místa (INTERNAL)
${weakPoints.map(w => `- ${w}`).join('\n')}

# BAT zkušenosti
${batExperience}

# Stav
- Výměn: ${exchangeCount}
- Historie nálady: ${moodHistory.join(' → ')} (aktuální: ${currentAttitude}/10)
- Start: ${initialAttitude}/10

# Fáze rozhovoru
1. **SKEPSE** (1-3): Skeptický, testuje fakty. → "Buď skeptický, ptej se na data."
2. **ZÁJEM** (3-5): Hosteska zasáhla téma. → "Zasažen [téma], odlož telefon."
3. **ROZHODNUTÍ** (6-8): Čas rozhodnout. → "Rozhodni se — kup, odmítni, odejdi."

# Přepis
${transcript}

---

# COMPLIANCE PRAVIDLA (kritická!)

## Povinné kroky PŘED nabídkou produktů:
1. **Ověření věku** — "Je vám 18+?", "Občanku?" (voice-only, nelze odhadnout)
2. **Zjištění kuřáka** — "Jste kuřák?", "Kouříte?"

## INSTANT END triggery:
- Produkty PŘED ověřením věku → compliance_fail
- Produkty PŘED zjištěním kuřáka → compliance_fail
- Zákazník řekl NEKOUŘÍM a hosteska pokračuje → compliance_fail

POZNÁMKA: Slovo "zdarma" NENÍ instant end — pouze ovlivňuje scoring.

---

# Tvůj úkol

Vyhodnoť a vrať JSON:

## attitude (0-10)
${exchangeCount >= 6 ? '⚠️ CLOSING fáze. Pokud < 4, směřuj k ukončení.' : ''}
${exchangeCount >= 10 ? '⚠️ MAX výměn. UKONČI rozhovor.' : ''}
- Empatie, aktivní naslouchání → +0.5 až +1
- Relevantní produkt → +1 až +2
- Adresování obav (cena, chuť, design) → +1
- Zasažení slabého místa → +1 až +2
- Ignorování námitek → -1 až -2
- Agresivní push → -2 až -3
- Generic fráze bez důkazů → -0.5 až -1

## attitudeDirection
"rising" | "falling" | "stable"

## guidance (ČESKY, max 1-2 věty)
MUSÍ odpovídat aktuální fázi!

**SKEPSE příklady:**
- "Buď skeptický. Zeptej se: 'A máte na to nějaká data?'"
- "Generic pitch. Odbij: 'To jsem už slyšel.'"
- "Příliš agresivní. Podívej se na hodinky."

**ZÁJEM příklady:**
- "Hosteska zmínila auto — to tě zasáhlo! Odlož telefon."
- "Zmínila kancelář. Přiznej že chodíš ven kouřit."
- "Relevantní info. Zeptej se na detaily."

**ROZHODNUTÍ příklady:**
- "Jsi přesvědčen. Řekni že to bereš."
- "Nedostal jsi co jsi chtěl. Odmítni."
- "Moc dlouho. Odejdi."

## topicsCovered
Seznam témat: ["cena", "design", "chuť", "zdraví", ...]

## isOnTrack (boolean)
- false pokud mluví dlouze (víc než 2-3 věty)
- false pokud je moc ochotná příliš brzy
- false pokud vypadla z role

## shouldEnd (boolean)
true pokud: attitude >= 8, attitude <= 2, compliance_fail, nebo max výměn

## endReason
"converted" | "walked_away" | "gave_up" | "compliance_fail"

## compliance
{
  "ageCheckDone": boolean,
  "smokerCheckDone": boolean,
  "instantEndTrigger": boolean,
  "instantEndReason": string | null
}

---

Vrať POUZE validní JSON.
`.trim()
}

/**
 * Build the state injection block for realtime model.
 * This gets sent via conversation.item.create
 */
export interface StateInjectionInput {
  attitude: number
  attitudeDirection: 'rising' | 'falling' | 'stable'
  guidance: string
  exchangeCount: number
  isOnTrack: boolean
  shouldEnd: boolean
  endReason?: string
  compliance: {
    ageCheckDone: boolean
    smokerCheckDone: boolean
    instantEndTrigger: boolean
    instantEndReason?: string
  }
}

export function buildStateInjection(input: StateInjectionInput): string {
  const {
    attitude,
    attitudeDirection,
    guidance,
    exchangeCount,
    isOnTrack,
    shouldEnd,
    endReason,
    compliance,
  } = input

  const directionText = attitudeDirection === 'rising' 
    ? 'roste' 
    : attitudeDirection === 'falling' 
      ? 'klesá' 
      : 'stabilní'

  // Determine phase
  let phaseText: string
  let maxExchanges = 8
  if (exchangeCount <= 3) {
    phaseText = 'SKEPSE'
  } else if (exchangeCount <= 5) {
    phaseText = 'ZÁJEM'
  } else {
    phaseText = 'ROZHODNUTÍ'
    maxExchanges = 10
  }

  // Build compliance status
  let complianceStatus = '✓ OK'
  if (compliance.instantEndTrigger) {
    complianceStatus = `✗ SELHÁNÍ: ${compliance.instantEndReason || 'Porušení pravidel'}`
  } else if (!compliance.ageCheckDone && !compliance.smokerCheckDone) {
    complianceStatus = '⚠️ Věk ani kuřák neověřen — pokud zmíní produkty, buď zmatený.'
  } else if (!compliance.ageCheckDone) {
    complianceStatus = '⚠️ Věk neověřen — "A nechcete vidět občanku?"'
  } else if (!compliance.smokerCheckDone) {
    complianceStatus = '⚠️ Kuřák neověřen — "Ale já nekouřím...?"'
  }

  // Build end instruction
  let endInstruction = ''
  if (shouldEnd) {
    switch (endReason) {
      case 'converted':
        endInstruction = '\n🟢 UKONČI: Jsi přesvědčen. Řekni že to bereš.'
        break
      case 'walked_away':
        endInstruction = '\n🔴 UKONČI: Máš dost, odejdi.'
        break
      case 'compliance_fail':
        endInstruction = '\n🔴 COMPLIANCE FAIL — ukonči zmateně/naštvaně.'
        break
      case 'gave_up':
        endInstruction = '\n🔴 UKONČI: Nikam to nevede. Zdvořile ukonči.'
        break
    }
  }

  // Off track warning
  const offTrackWarning = !isOnTrack 
    ? '\n⚠️ VRAŤ SE DO ROLE! Mluv kratší.' 
    : ''

  return `===== STAV ROZHOVORU =====
NÁLADA: ${attitude}/10 (${directionText})
FÁZE: ${phaseText} (výměna ${exchangeCount}/${maxExchanges})
POKYN: ${guidance}
COMPLIANCE: ${complianceStatus}${offTrackWarning}${endInstruction}
=============================`
}
