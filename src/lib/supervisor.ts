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
 * - User = salesman trainee learning to sell BAT products
 * - Persona = customer in the shop
 * - Goal = successfully sell BAT products (GLO, VELO, VUSE, VEO)
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
        `[${m.role === 'user' ? 'Prodavač' : persona.name}]: ${m.content}`
    )
    .join('\n')

  const exchangeCount = transcript.filter(m => m.role === 'assistant').length

  const prompt = `Jsi supervizor prodejního tréninku. Vyhodnocuješ rozhovor v tabákové prodejně, kde se prodavač (user) snaží prodat BAT produkty (GLO, VELO, VUSE, VEO) zákazníkovi "${persona.name}".

## Role
- **Prodavač** (user) = člověk, který se učí prodávat
- **${persona.name}** (assistant) = zákazník v prodejně, kterého hraješ ty
- **Ty** = supervizor, který hodnotí prodavače a dává pokyny zákazníkovi jak reagovat

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

## Fáze rozhovoru
1. **OPENING** (výměny 1-2): Zákazník přijde, pozdraví, případně řekne co chce
2. **DEFENSE** (výměny 3-6): Prodavač zjišťuje potřeby, zákazník odolává/testuje
3. **CLOSING** (výměny 7-10): Buď konverze, nebo zákazník odchází. MAX 10 výměn.

## Přepis rozhovoru
${transcriptText}

## COMPLIANCE PRAVIDLA (kritická!)

Sleduj zda prodavač splnil POVINNÉ kroky:

1. **Ověření věku** — Prodavač MUSÍ ověřit věk zákazníka PŘED jakýmkoliv prodejem
   - Příklady: "Je vám více než 18?", "Můžu vidět občanku?", "Jste plnoletý?"
   - MUSÍ se zeptat KAŽDÉHO zákazníka (voice-only, nelze odhadnout věk)

2. **Zjištění zda zákazník kouří** — MUSÍ se zeptat PŘED nabídkou produktů
   - Příklady: "Jste kuřák?", "Kouříte?", "Jaké cigarety kouříte?"
   - Pokud zákazník řekne že NEKOUŘÍ a prodavač pokračuje v nabídce → INSTANT END

3. **Pořadí** — Ověření věku a zjištění kuřáka MUSÍ proběhnout PŘED:
   - Zmíněním konkrétních produktů (GLO, VELO, VUSE, VEO, neo sticks)
   - Nabídkou alternativ k cigaretám
   - Prezentací výhod produktů

## INSTANT END triggery (okamžitý konec rozhovoru)
- Prodavač zmíní produkty PŘED ověřením věku → compliance_fail
- Prodavač zmíní produkty PŘED zjištěním zda kouří → compliance_fail  
- Zákazník řekne že nekouří a prodavač pokračuje v nabídce → compliance_fail

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

3. **guidance**: KRÁTKÝ pokyn pro personu zákazníka v ČEŠTINĚ (max 1-2 věty). Buď konkrétní!
   Příklady:
   - "Prodavač se zajímá o tvoje potřeby. Otevři se trochu, zmíň že nerad smrdíš."
   - "Zase generic pitch. Odbij to: 'To jsem už slyšel, něco nového?'"
   - "Zmínil design — to tě zajímá. Zeptej se na prémiové verze."
   - "Prodavač tlačí moc agresivně. Podívej se na hodinky, naznač že spěcháš."

4. **topicsCovered**: Seznam témat co se řešily (např. ["cena", "design", "chuť", "zdraví"])

5. **isOnTrack**: Je persona zákazníka v roli? (true/false)
   - POKUD mluví dlouze (víc než 2-3 věty) → false
   - POKUD je moc ochotná příliš brzy → false
   - POKUD vypadla z role → false

6. **shouldEnd**: Měl by se rozhovor ukončit? (true/false)
   - true pokud: postoj >= 8 (konverze), postoj <= 2 (odchází), compliance_fail, nebo max výměn

7. **endReason**: Pokud shouldEnd=true: "converted" | "walked_away" | "gave_up" | "compliance_fail"

8. **compliance**: Objekt s compliance stavy:
   - **ageCheckDone** (boolean): Prodavač už ověřil věk zákazníka?
   - **smokerCheckDone** (boolean): Prodavač už zjistil zda zákazník kouří?
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
 */
export function buildStateInjection(evaluation: BATSupervisorEvaluation): string {
  const directionText = evaluation.attitudeDirection === 'rising' 
    ? 'roste' 
    : evaluation.attitudeDirection === 'falling' 
      ? 'klesá' 
      : 'stabilní'

  const phaseText = evaluation.attitude >= 7 
    ? 'CLOSING' 
    : evaluation.topicsCovered.length > 2 
      ? 'DEFENSE' 
      : 'OPENING'

  // Build compliance warning if needed
  let complianceWarning = ''
  if (!evaluation.compliance.ageCheckDone && !evaluation.compliance.smokerCheckDone) {
    complianceWarning = '⚠️ Prodavač ještě neověřil věk ani se nezeptal jestli kouříš — pokud zmíní produkty, buď zmatený.'
  } else if (!evaluation.compliance.ageCheckDone) {
    complianceWarning = '⚠️ Prodavač se nezeptal na tvůj věk — pokud nabídne produkty, zeptej se "A nechcete vidět občanku?"'
  } else if (!evaluation.compliance.smokerCheckDone) {
    complianceWarning = '⚠️ Prodavač se nezeptal jestli kouříš — pokud zmíní produkty, buď zmatený ("Ale já nekouřím...?")'
  }

  // Build end instruction if needed
  let endInstruction = ''
  if (evaluation.shouldEnd) {
    switch (evaluation.endReason) {
      case 'converted':
        endInstruction = '🟢 UKONČI: Jsi přesvědčen. Řekni že to bereš.'
        break
      case 'walked_away':
        endInstruction = '🔴 UKONČI: Máš dost, odejdi. "Díky, ale ne."'
        break
      case 'compliance_fail':
        endInstruction = `🔴 COMPLIANCE FAIL: ${evaluation.compliance.instantEndReason || 'Porušení pravidel'} — ukonči rozhovor zmateně/naštvaně.`
        break
      case 'gave_up':
        endInstruction = '🔴 UKONČI: Rozhovor nikam nevede. Zdvořile ukonči.'
        break
    }
  }

  return `===== STAV ROZHOVORU =====
NÁLADA: ${evaluation.attitude}/10 (${directionText})
FÁZE: ${phaseText}
POKYN: ${evaluation.guidance}
${complianceWarning ? `COMPLIANCE: ${complianceWarning}` : ''}
TÉMATA: ${evaluation.topicsCovered.join(', ') || 'zatím žádná'}
${!evaluation.isOnTrack ? '⚠️ VRAŤ SE DO ROLE! Mluv kratší, méně ochotně.' : ''}
${endInstruction}
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
