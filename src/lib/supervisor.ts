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

  const weakPoints = persona.prompt.weakPoints ?? []
  const batExperience = persona.prompt.batExperience ?? ''

  const prompt = `Jsi supervizor prodejního tréninku. Vyhodnocuješ rozhovor v tabákové prodejně.

## Scénář
Zákazník "${persona.name}" přišel do trafiky koupit své obvyklé cigarety. Hosteska (propagační pracovnice BAT) ho osloví a snaží se mu představit BAT alternativy (GLO, VELO, VUSE, VEO).

## Role
- **Hosteska** (user) = propagační pracovnice, která se učí oslovovat zákazníky a nabízet BAT produkty
- **${persona.name}** (assistant) = zákazník, který přišel koupit cigarety a kterého hraješ ty
- **Ty** = supervizor, který hodnotí hostesku a dává pokyny zákazníkovi jak reagovat

## Zkušenosti zákazníka s BAT produkty
${batExperience}

## Slabá místa zákazníka (INTERNÍ — nikdy nezmiňuj přímo)
${weakPoints.map(w => `- ${w}`).join('\n')}

## Stav
- Výměn: ${exchangeCount}
- Historie nálady: ${moodHistory.join(' → ')} (aktuální: ${currentAttitude}/10)
- Počáteční nálada: ${persona.initialAttitude}/10

## Fáze rozhovoru
Fáze závisí na OBSAHU rozhovoru, ne jen na čísle výměny.

1. **SKEPSE**: Hosteska začala pitchovat. Zákazník je skeptický, testuje fakty.
2. **ZÁJEM**: Hosteska zasáhla slabé místo. Zákazník zbystřel, poslouchá.
3. **ROZHODNUTÍ** (výměny 6-8): Čas se rozhodnout. MAX 8-10 výměn.

## Přepis rozhovoru
${transcriptText}

## Compliance (quick check)
- ageCheckDone: true pokud se hosteska JAKKOLIV zeptala na věk (např. "Je vám 18?", "Kolik vám je?", otázka na věk)
- smokerCheckDone: true pokud se hosteska JAKKOLIV zeptala na kouření (např. "Kouříte?", "Jaké cigarety?", otázka na kouření/nikotin)
- instantEndTrigger: true POUZE pokud zmínila BAT produkty (GLO, VELO, VUSE, VEO, neo sticks) PŘED oběma checky
- Pozdravy a small talk NEJSOU porušení.

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

3. **guidance**: KRÁTKÝ pokyn pro personu v ČEŠTINĚ (max 1-2 věty). Popisuj CHOVÁNÍ a EMOCE, ne přesné repliky! Buď specifický k tomu co se děje:
   Příklady pro Adama:
   - "Zmínila zápach v Q8 a kožená sedadla — to tě zasáhlo. Odlož telefon, buď věcnější."
   - "Generic sales pitch bez dat. Zkontroluj hodinky, znuděně odpověz."
   - "Zmínila že kolegové v kanclu přešli — sociální hanba. Ztichni, zeptej se na detail."
   - "Tlačí moc agresivně. Naznač že spěcháš, podívej se na telefon."
   - "Rozhovor se nikam nehýbe. Ukonči to zdvořile."
   - "Hosteska se ptá na formality. Odpověz normálně, nic zvláštního."

4. **topicsCovered**: Seznam témat co se řešily (např. ["cena", "design", "chuť", "zdraví", "auto", "kancelář"])

5. **isOnTrack**: Je persona zákazníka v roli? (true/false)
   - POKUD mluví dlouze (víc než 2-3 věty) → false
   - POKUD je moc ochotná příliš brzy → false
   - POKUD vypadla z role → false

6. **shouldEnd**: Měl by se rozhovor ukončit? (true/false)
   - true pokud: postoj >= 6 A stoupající (konverze), postoj <= 3 (odchází), compliance_fail, nebo max výměn
   ${exchangeCount >= 8 ? '- Postoj >= 5 a stoupající? Povol ještě 1-2 výměny.' : ''}

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
 * Includes TÉMATA line for topic context (Pepik pattern)
 */
export function buildStateInjection(
  evaluation: BATSupervisorEvaluation
): string {
  const directionText = evaluation.attitudeDirection === 'rising'
    ? 'roste'
    : evaluation.attitudeDirection === 'falling'
      ? 'klesá'
      : 'stabilní'

  // Build topics line
  const topicsLine = evaluation.topicsCovered.length > 0
    ? `\nTÉMATA: ${evaluation.topicsCovered.join(', ')}`
    : ''

  // Build end/warning lines
  let extra = ''
  if (!evaluation.isOnTrack) {
    extra += '\n⚠️ VRAŤ SE DO ROLE! Mluv kratší, méně ochotně.'
  }
  if (evaluation.shouldEnd) {
    const endMap: Record<string, string> = {
      converted: '🟢 UKONČI: Jsi přesvědčen. NEJDŘÍV řekni NAHLAS rozloučení (přiznej to), pak zavolej end_conversation.',
      walked_away: '🔴 UKONČI: Máš dost. NEJDŘÍV řekni NAHLAS rozloučení (odejdi), pak zavolej end_conversation.',
      compliance_fail: '🔴 COMPLIANCE FAIL — NEJDŘÍV řekni NAHLAS rozloučení, pak zavolej end_conversation.',
      gave_up: '🔴 UKONČI: Rozhovor nikam nevede. NEJDŘÍV řekni NAHLAS rozloučení, pak zavolej end_conversation.',
    }
    extra += `\n${endMap[evaluation.endReason!] || '🔴 UKONČI ROZHOVOR — NEJDŘÍV řekni NAHLAS rozloučení, pak zavolej end_conversation.'}`
  }

  return `===== STAV ROZHOVORU =====
NÁLADA: ${evaluation.attitude}/10 (${directionText})
POKYN: ${evaluation.guidance}${topicsLine}${extra}
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
