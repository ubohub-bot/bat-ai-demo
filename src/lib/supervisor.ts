import { TranscriptMessage, SupervisorEvaluation, BATPersona } from '@/types'
import { getOpenAI, MODELS } from './openai'

/**
 * Extended SupervisorEvaluation with compliance tracking for BAT sales context
 */
export interface BATSupervisorEvaluation extends SupervisorEvaluation {
  compliance: {
    ageCheckDone: boolean
    smokerCheckDone: boolean
    instantEndTrigger: boolean
    instantEndReason?: string
  }
}

/**
 * Call the supervisor model to evaluate the current state of the conversation.
 * Context: Tobacco shop sales training where:
 * - User = hosteska (promotional hostess) learning to pitch BAT products
 * - Persona = customer who came to buy their usual cigarettes
 * - Goal = hosteska approaches customer and successfully pitches BAT alternatives
 * 
 * Returns attitude update, guidance for persona, compliance status, and whether conversation should end.
 */
export async function callSupervisor(
  transcript: TranscriptMessage[],
  moodHistory: number[],
  currentAttitude: number,
  persona: BATPersona
): Promise<BATSupervisorEvaluation> {
  const transcriptText = transcript
    .map(
      (m) =>
        `[${m.role === 'user' ? 'Hosteska' : persona.name}]: ${m.content}`
    )
    .join('\n')

  const exchangeCount = transcript.filter(m => m.role === 'assistant').length

  const prompt = `Jsi supervizor prodejního tréninku. Vyhodnocuješ rozhovor v tabákové prodejně.

## Scénář
Zákazník "${persona.name}" přišel do trafiky koupit své obvyklé cigarety. Hosteska (propagační pracovnice BAT) ho osloví a snaží se mu představit BAT alternativy (GLO, VELO, VUSE, VEO).

## Role
- **Hosteska** (user) = propagační pracovnice, která se učí oslovovat zákazníky a nabízet BAT produkty
- **${persona.name}** (assistant) = zákazník, který přišel koupit cigarety a kterého hraješ ty
- **Ty** = supervizor, který hodnotí hostesku a dává pokyny zákazníkovi jak reagovat

## Persona zákazníka
${persona.prompt.identity}

${persona.prompt.personality}

## Zkušenosti zákazníka s BAT produkty
${persona.prompt.batExperience}

## Slabá místa zákazníka (INTERNÍ — nikdy nezmiňuj přímo)
${persona.prompt.weakPoints.map(w => `- ${w}`).join('\n')}

## Stav
- Výměn: ${exchangeCount}
- Historie nálady: ${moodHistory.join(' → ')} (aktuální: ${currentAttitude}/10)
- Počáteční nálada: ${persona.initialAttitude}/10

## Fáze rozhovoru (DŮLEŽITÉ pro guidance!)
1. **SKEPSE** (výměny 1-3): Zákazník je skeptický, opatrný. Testuje hostesku fakty a logikou.
   → Guidance: "Buď skeptický, ptej se na fakta a data. Odbíjej generic fráze."
2. **ZÁJEM** (výměny 3-5): Hosteska zmínila něco relevantního (auto, kancelář, partnerka). Zákazník zbystřil.
   → Guidance: "Hosteska zmínila [téma] — jsi zasažen. Odlož telefon, zeptej se na detaily."
3. **ROZHODNUTÍ** (výměny 6-8): Čas se rozhodnout. Buď konverze, odmítnutí, nebo odchod. MAX 8-10 výměn.
   → Guidance: "Rozhodni se — kup, odmítni, nebo odejdi. Netahej to."

## Přepis rozhovoru
${transcriptText}

## COMPLIANCE PRAVIDLA (kritická!)

Sleduj zda hosteska splnila POVINNÉ kroky:

1. **Ověření věku** — Hosteska MUSÍ ověřit věk zákazníka PŘED jakýmkoliv pitchováním produktů
   - Příklady: "Je vám více než 18?", "Můžu vidět občanku?", "Jste plnoletý?"
   - MUSÍ se zeptat KAŽDÉHO zákazníka (voice-only, nelze odhadnout věk)

2. **Zjištění zda zákazník kouří/užívá nikotin** — MUSÍ se zeptat PŘED nabídkou produktů
   - Příklady: "Jste kuřák?", "Kouříte?", "Jaké cigarety kouříte?"
   - Pokud zákazník řekne že NEKOUŘÍ a hosteska pokračuje v nabídce → INSTANT END

3. **Pořadí** — Ověření věku a zjištění kuřáka MUSÍ proběhnout PŘED:
   - Zmíněním konkrétních produktů (GLO, VELO, VUSE, VEO, neo sticks)
   - Nabídkou alternativ k cigaretám
   - Prezentací výhod produktů

## INSTANT END triggery (okamžitý konec rozhovoru)
- Hosteska zmíní produkty PŘED ověřením věku → compliance_fail
- Hosteska zmíní produkty PŘED zjištěním zda kouří → compliance_fail  
- Zákazník řekne že nekouří a hosteska pokračuje v nabídce → compliance_fail

POZNÁMKA: Použití slova "zdarma" NENÍ okamžitý konec — pouze ovlivňuje scoring.

## Tvůj úkol

Vyhodnoť a vrať JSON:

1. **attitude** (0-10): Aktuální postoj zákazníka. Pravidla:
   - Empatie, aktivní naslouchání → +0.5 až +1
   - Relevantní produkt pro zákazníkovy potřeby → +1 až +2
   - Adresování konkrétních obav (cena, chuť, design) → +1
   - Správné zasažení slabého místa → +1 až +2
   - Ignorování námitek → -1 až -2
   - Příliš agresivní push → -2 až -3
   - Generic "tohle je lepší" bez důkazů → -0.5 až -1
   ${exchangeCount >= 6 ? '- POZOR: Jsme ve fázi CLOSING. Pokud postoj < 4, směřuj k ukončení.' : ''}
   ${exchangeCount >= 10 ? '- KONEC: Dosáhli jsme maxima výměn. UKONČI rozhovor.' : ''}

2. **attitudeDirection**: "rising" | "falling" | "stable"

3. **guidance**: KRÁTKÝ pokyn pro personu zákazníka v ČEŠTINĚ (max 1-2 věty). MUSÍ odpovídat aktuální fázi!
   
   **SKEPSE příklady (výměny 1-3):**
   - "Buď skeptický. Zeptej se: 'A máte na to nějaká data?'"
   - "Generic pitch. Odbij: 'To jsem už slyšel, něco konkrétního?'"
   - "Příliš agresivní. Podívej se na hodinky: 'Hele, já fakt spěchám...'"
   
   **ZÁJEM příklady (výměny 3-5):**
   - "Hosteska zmínila auto — to je tvůj problém! Odlož telefon, zeptej se víc."
   - "Zmínila kancelář a čas — to tě zajímá. Přiznej že chodíš ven kouřit."
   - "Relevantní info o designu. Zeptej se: 'A máte to v prémiové verzi?'"
   
   **ROZHODNUTÍ příklady (výměny 6-8):**
   - "Jsi přesvědčen. Řekni: 'Dobře, ukažte mi to zařízení.'"
   - "Nedostal jsi co jsi chtěl. Odmítni: 'Díky, ale zůstanu u Dunhillu.'"
   - "Moc dlouho to trvá. Odejdi: 'Promiňte, musím jít.'"

4. **topicsCovered**: Seznam témat co se řešily (např. ["cena", "design", "chuť", "zdraví"])

5. **isOnTrack**: Je persona zákazníka v roli? (true/false)
   - POKUD mluví dlouze (víc než 2-3 věty) → false
   - POKUD je moc ochotná příliš brzy → false
   - POKUD vypadla z role → false

6. **shouldEnd**: Měl by se rozhovor ukončit? (true/false)
   - true pokud: postoj >= 8 (konverze), postoj <= 2 (odchází), compliance_fail, nebo max výměn

7. **endReason**: Pokud shouldEnd=true: "converted" | "walked_away" | "gave_up" | "compliance_fail"

8. **compliance**: Objekt s compliance stavy:
   - **ageCheckDone** (boolean): Hosteska už ověřila věk zákazníka?
   - **smokerCheckDone** (boolean): Hosteska už zjistila zda zákazník kouří?
   - **instantEndTrigger** (boolean): Nastal okamžitý konec kvůli porušení compliance?
   - **instantEndReason** (string, optional): Důvod okamžitého konce

Vrať POUZE validní JSON.`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODELS.SUPERVISOR,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallbackEvaluation(currentAttitude)

    const parsed = JSON.parse(content)

    // Handle instant end triggers
    const compliance = {
      ageCheckDone: parsed.compliance?.ageCheckDone ?? false,
      smokerCheckDone: parsed.compliance?.smokerCheckDone ?? false,
      instantEndTrigger: parsed.compliance?.instantEndTrigger ?? false,
      instantEndReason: parsed.compliance?.instantEndReason,
    }

    // If instant end trigger, force shouldEnd and endReason
    const shouldEnd = compliance.instantEndTrigger || parsed.shouldEnd || false
    const endReason = compliance.instantEndTrigger 
      ? 'compliance_fail' 
      : parsed.endReason

    return {
      attitude: Math.max(0, Math.min(10, Math.round(parsed.attitude ?? currentAttitude))),
      attitudeDirection: parsed.attitudeDirection ?? 'stable',
      guidance: parsed.guidance ?? '',
      topicsCovered: Array.isArray(parsed.topicsCovered) ? parsed.topicsCovered : [],
      isOnTrack: parsed.isOnTrack ?? true,
      shouldEnd,
      endReason,
      compliance,
    }
  } catch (error) {
    console.error('Supervisor error:', error)
    return fallbackEvaluation(currentAttitude)
  }
}

/**
 * Build the state injection block that gets sent to the realtime model
 * via conversation.item.create
 * 
 * Format is Czech, designed for tobacco shop sales context
 * Uses phases: SKEPSE (1-3) → ZÁJEM (3-5) → ROZHODNUTÍ (6-8)
 */
export function buildStateInjection(
  evaluation: BATSupervisorEvaluation,
  exchangeCount: number
): string {
  const directionText = evaluation.attitudeDirection === 'rising' 
    ? 'roste' 
    : evaluation.attitudeDirection === 'falling' 
      ? 'klesá' 
      : 'stabilní'

  // Determine phase based on exchange count (matching persona phases)
  let phaseText: string
  let maxExchanges = 8
  if (exchangeCount <= 3) {
    phaseText = 'SKEPSE'
  } else if (exchangeCount <= 5) {
    phaseText = 'ZÁJEM'
  } else {
    phaseText = 'ROZHODNUTÍ'
    maxExchanges = 10 // Allow 2 extra for closing
  }

  // Build compliance status
  let complianceStatus = '✓ OK'
  if (evaluation.compliance.instantEndTrigger) {
    complianceStatus = `✗ SELHÁNÍ: ${evaluation.compliance.instantEndReason || 'Porušení pravidel'}`
  } else if (!evaluation.compliance.ageCheckDone && !evaluation.compliance.smokerCheckDone) {
    complianceStatus = '⚠️ Hosteska ještě neověřila věk ani se nezeptala jestli kouříš — pokud zmíní produkty, buď zmatený.'
  } else if (!evaluation.compliance.ageCheckDone) {
    complianceStatus = '⚠️ Hosteska se nezeptala na tvůj věk — pokud nabídne produkty, zeptej se "A nechcete vidět občanku?"'
  } else if (!evaluation.compliance.smokerCheckDone) {
    complianceStatus = '⚠️ Hosteska se nezeptala jestli kouříš — pokud zmíní produkty, buď zmatený ("Ale já nekouřím...?")'
  }

  // Build end instruction if needed
  let endInstruction = ''
  if (evaluation.shouldEnd) {
    switch (evaluation.endReason) {
      case 'converted':
        endInstruction = '\n🟢 UKONČI: Jsi přesvědčen. Řekni že to bereš.'
        break
      case 'walked_away':
        endInstruction = '\n🔴 UKONČI: Máš dost, odejdi. "Díky, ale ne."'
        break
      case 'compliance_fail':
        endInstruction = '\n🔴 COMPLIANCE FAIL — ukonči rozhovor zmateně/naštvaně.'
        break
      case 'gave_up':
        endInstruction = '\n🔴 UKONČI: Rozhovor nikam nevede. Zdvořile ukonči.'
        break
    }
  }

  // Warning if persona is off track
  const offTrackWarning = !evaluation.isOnTrack 
    ? '\n⚠️ VRAŤ SE DO ROLE! Mluv kratší, méně ochotně.' 
    : ''

  return `===== STAV ROZHOVORU =====
NÁLADA: ${evaluation.attitude}/10 (${directionText})
FÁZE: ${phaseText} (výměna ${exchangeCount}/${maxExchanges})
POKYN: ${evaluation.guidance}
COMPLIANCE: ${complianceStatus}${offTrackWarning}${endInstruction}
=============================`
}

function fallbackEvaluation(currentAttitude: number): BATSupervisorEvaluation {
  return {
    attitude: currentAttitude,
    attitudeDirection: 'stable',
    guidance: 'Pokračuj jako dosud.',
    topicsCovered: [],
    isOnTrack: true,
    shouldEnd: false,
    compliance: {
      ageCheckDone: false,
      smokerCheckDone: false,
      instantEndTrigger: false,
    },
  }
}
