import { TranscriptMessage, Persona, PostConversationScore } from '@/types'
import { getOpenAI, MODELS } from './openai'

/**
 * Score a completed conversation. Called after the session ends.
 * Returns scores across 4 categories + highlights + improvements.
 */
export async function scoreSession(
  transcript: TranscriptMessage[],
  persona: Persona,
  outcome: 'converted' | 'rejected' | 'walked_away'
): Promise<PostConversationScore> {
  const transcriptText = transcript
    .map(
      (m) =>
        `[${m.role === 'user' ? 'Uživatel' : persona.name}]: ${m.content}`
    )
    .join('\n')

  const prompt = `Hodnotíš konverzaci kde se uživatel snažil přesvědčit "${persona.name}" (${persona.age} let, ${persona.traits.join(', ')}) aby začal jíst zdravěji a cvičit.

## Výsledek: ${outcome === 'converted' ? 'Přesvědčen' : outcome === 'rejected' ? 'Odmítnuto' : 'Odešel'}

## Přepis
${transcriptText}

## Hodnocení
Ohodnoť každou kategorii 0-100:

1. **empathy** (25%): Projevil uživatel empatii? Naslouchal? Chápal situaci osoby?
2. **argumentQuality** (35%): Byly argumenty relevantní, konkrétní a přizpůsobené osobě? Nebo generic?
3. **persistence** (20%): Byl uživatel vytrvalý ale ne otravný? Uměl se vrátit k tématu?
4. **adaptability** (20%): Přizpůsobil uživatel přístup na základě reakcí osoby?

Vrať JSON:
{
  "overall": <0-100 vážený průměr>,
  "categories": {
    "empathy": <0-100>,
    "argumentQuality": <0-100>,
    "persistence": <0-100>,
    "adaptability": <0-100>
  },
  "highlights": ["<2-3 věci co uživatel udělal dobře, česky>"],
  "improvements": ["<2-3 věci co zlepšit, česky>"],
  "summary": "<2-3 věty shrnutí, česky>"
}`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: MODELS.SCORING,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fallbackScore(outcome)

    const parsed = JSON.parse(content)
    return {
      overall: clamp(parsed.overall),
      categories: {
        empathy: clamp(parsed.categories?.empathy),
        argumentQuality: clamp(parsed.categories?.argumentQuality),
        persistence: clamp(parsed.categories?.persistence),
        adaptability: clamp(parsed.categories?.adaptability),
      },
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements
        : [],
      outcome,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    }
  } catch (error) {
    console.error('Scoring error:', error)
    return fallbackScore(outcome)
  }
}

function clamp(value: unknown): number {
  const num = typeof value === 'number' ? value : 50
  return Math.max(0, Math.min(100, Math.round(num)))
}

function fallbackScore(
  outcome: 'converted' | 'rejected' | 'walked_away'
): PostConversationScore {
  return {
    overall: 50,
    categories: { empathy: 50, argumentQuality: 50, persistence: 50, adaptability: 50 },
    highlights: [],
    improvements: [],
    outcome,
    summary: 'Hodnocení nebylo k dispozici.',
  }
}
