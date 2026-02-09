import { TranscriptMessage, SupervisorEvaluation, Persona } from '@/types'
import { getOpenAI, MODELS } from './openai'

/**
 * Call the supervisor model to evaluate the current state of the conversation.
 * Returns attitude update, guidance for persona, and whether conversation should end.
 */
export async function callSupervisor(
  transcript: TranscriptMessage[],
  moodHistory: number[],
  currentAttitude: number,
  persona: Persona
): Promise<SupervisorEvaluation> {
  const transcriptText = transcript
    .map(
      (m) =>
        `[${m.role === 'user' ? 'Uživatel' : persona.name}]: ${m.content}`
    )
    .join('\n')

  const exchangeCount = transcript.filter(m => m.role === 'assistant').length

  const prompt = `Jsi supervizor konverzace. Vyhodnocuješ rozhovor kde uživatel přesvědčuje "${persona.name}" aby začal jíst zdravěji a cvičit.

## Persona
${persona.name}, ${persona.age} let. ${persona.traits.join(', ')}.
Slabá místa: ${persona.weakPoints.join('; ')}.

## Stav
- Výměn (assistant): ${exchangeCount}
- Historie nálady: ${moodHistory.join(' → ')} (aktuální: ${currentAttitude}/10)

## Konverzace má 3 fáze:
1. OBRANA (výměny 1-3): Pepík odráží vše vtipem a výmluvami
2. TRHLINA (výměny 3-5): Pokud uživatel zasáhne slabé místo, Pepík se změní
3. ROZHODNUTÍ (výměny 6-8): Pepík se buď otevře nebo uzavře. MAX 10 výměn celkem.

## Přepis
${transcriptText}

## Tvůj úkol
Vyhodnoť a vrať JSON:

1. **attitude** (1-10): Aktuální postoj. Pravidla:
   - Empatie a trpělivost → +0.5 až +1
   - Zasažení slabého místa (děti, stud, zdraví) → +1 až +2
   - Osobní příběhy a konkrétní příklady → +1
   - Moralizování nebo tlak → -1 až -3 (RYCHLÝ pokles!)
   - Generic rady "prostě cvič" → 0 nebo -0.5
   - Začátek: ${persona.initialAttitude}
   ${exchangeCount >= 6 ? '- POZOR: Jsme ve fázi ROZHODNUTÍ. Pokud postoj < 5, směřuj k ukončení.' : ''}
   ${exchangeCount >= 10 ? '- KONEC: Dosáhli jsme absolutního maxima výměn. UKONČI rozhovor.' : exchangeCount >= 8 ? '- BLÍZKO KONCE: Pokud postoj roste, dej ještě šanci. Pokud stagnuje, ukonči.' : ''}

2. **attitudeDirection**: "rising" | "falling" | "stable"

3. **guidance**: KRÁTKÝ pokyn pro personu v ČEŠTINĚ (max 1-2 věty). Buď konkrétní!
   Příklady:
   - "Ten argument o dětech tě zasáhl. Buď tišší, přestaň se smát."
   - "Tohle je generic rada. Odbij to vtipem o dědovi."
   - "Moralizuje tě. Obrať to do srandy a naznač že chceš jít."
   - "Začínáš se otevírat. Přiznej jednu věc co tě trápí."

4. **topicsCovered**: Seznam témat co se řešily.

5. **isOnTrack**: Je persona v roli? Mluví krátce? Není moc hodná? (true/false)
   - POKUD mluví dlouze (víc než 2-3 věty) → false
   - POKUD je moc ochotná příliš brzy → false
   - POKUD vypadla z role → false

6. **shouldEnd**: Měl by se rozhovor ukončit? (true/false)
   - true pokud: postoj >= 8, nebo postoj < 3, nebo ${exchangeCount >= 8 ? 'DOSÁHLI JSME MAXIMA VÝMĚN' : 'rozhovor se nikam nehýbe po 6+ výměnách'}
   - ${exchangeCount >= 8 ? 'POZOR: I při maximu výměn — pokud postoj ROSTE a persona se otevírá, NECH JE pokračovat ještě 2-3 výměny!' : ''}

7. **endReason**: Pokud shouldEnd=true: "converted" (postoj >= 6 A roste) | "walked_away" (<3 nebo moralizování) | "gave_up" (moc výměn bez pokroku A postoj NEROSTE)

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

    return {
      attitude: Math.max(1, Math.min(10, Math.round(parsed.attitude ?? currentAttitude))),
      attitudeDirection: parsed.attitudeDirection ?? 'stable',
      guidance: parsed.guidance ?? '',
      topicsCovered: Array.isArray(parsed.topicsCovered) ? parsed.topicsCovered : [],
      isOnTrack: parsed.isOnTrack ?? true,
      shouldEnd: parsed.shouldEnd ?? false,
      endReason: parsed.endReason,
    }
  } catch (error) {
    console.error('Supervisor error:', error)
    return fallbackEvaluation(currentAttitude)
  }
}

/**
 * Build the state injection block that gets sent to the realtime model
 * via conversation.item.create
 */
export function buildStateInjection(evaluation: SupervisorEvaluation): string {
  return `===== STAV ROZHOVORU =====
NÁLADA: ${evaluation.attitude}/10 (${evaluation.attitudeDirection === 'rising' ? 'roste' : evaluation.attitudeDirection === 'falling' ? 'klesá' : 'stabilní'})
POKYN: ${evaluation.guidance}
TÉMATA: ${evaluation.topicsCovered.join(', ') || 'zatím žádná'}
${!evaluation.isOnTrack ? '⚠️ VRAŤ SE DO ROLE! Mluv kratší, méně ochotně.' : ''}
${evaluation.shouldEnd ? `🔴 UKONČI ROZHOVOR: ${evaluation.endReason === 'converted' ? 'Jsi přesvědčen, přiznej to.' : evaluation.endReason === 'walked_away' ? 'Máš dost, odejdi.' : 'Prostě to ukonči.'}` : ''}
=============================`
}

function fallbackEvaluation(currentAttitude: number): SupervisorEvaluation {
  return {
    attitude: currentAttitude,
    attitudeDirection: 'stable',
    guidance: 'Pokračuj jako dosud.',
    topicsCovered: [],
    isOnTrack: true,
    shouldEnd: false,
  }
}
