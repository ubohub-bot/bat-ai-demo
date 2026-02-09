import { TranscriptMessage, BATScore } from '@/types'
import { getOpenAI, MODELS } from './openai'
import { 
  buildScoringPrompt, 
  calculateOverallScore, 
  detectForbiddenWords,
  SCORING_WEIGHTS 
} from '@/prompts'

const PERSONA_NAME = 'Adam'

/**
 * Score a completed BAT training session.
 * Evaluates hosteska performance across 4 categories with compliance tracking.
 */
export async function scoreSession(
  transcript: TranscriptMessage[],
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
): Promise<BATScore> {
  const transcriptText = transcript
    .map(
      (m) =>
        `[${m.role === 'user' ? 'Hosteska' : PERSONA_NAME}]: ${m.content}`
    )
    .join('\n')

  // Pre-scan for forbidden words in hosteska's messages
  const hosteskaMessages = transcript
    .filter((m) => m.role === 'user')
    .map((m) => m.content)

  const detectedForbiddenWords = detectForbiddenWords(hosteskaMessages)

  const prompt = buildScoringPrompt({
    transcript: transcriptText,
    personaName: PERSONA_NAME,
    outcome,
    detectedForbiddenWords,
  })

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

    const overall = calculateOverallScore(categories)

    return {
      overall,
      categories,
      complianceDetails: {
        ageVerification: parseComplianceStatus(parsed.complianceDetails?.ageVerification),
        smokerCheck: parseComplianceStatus(parsed.complianceDetails?.smokerCheck),
        forbiddenWords: detectedForbiddenWords,
      },
      phaseHandling: {
        skepseBreakthrough: parsed.phaseHandling?.skepseBreakthrough ?? false,
        interestRecognized: parsed.phaseHandling?.interestRecognized ?? false,
        weakPointsUsed: Array.isArray(parsed.phaseHandling?.weakPointsUsed) 
          ? parsed.phaseHandling.weakPointsUsed 
          : [],
        decisionHelped: parsed.phaseHandling?.decisionHelped ?? false,
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
    phaseHandling: {
      skepseBreakthrough: false,
      interestRecognized: false,
      weakPointsUsed: [],
      decisionHelped: false,
    },
    highlights: [],
    improvements: ['Hodnocení nebylo k dispozici.'],
    fails: [],
    outcome,
  }
}

// Re-export weights for reference
export { SCORING_WEIGHTS }
