import { TranscriptMessage } from '@/types'
import { getOpenAI, MODELS } from './openai'
import { 
  buildSupervisorPrompt, 
  buildStateInjection,
  type StateInjectionInput 
} from '@/prompts'

/**
 * Extended SupervisorEvaluation with compliance tracking for BAT sales context
 */
export interface BATSupervisorEvaluation {
  attitude: number
  attitudeDirection: 'rising' | 'falling' | 'stable'
  guidance: string
  topicsCovered: string[]
  isOnTrack: boolean
  shouldEnd: boolean
  endReason?: 'converted' | 'walked_away' | 'gave_up' | 'compliance_fail'
  compliance: {
    ageCheckDone: boolean
    smokerCheckDone: boolean
    instantEndTrigger: boolean
    instantEndReason?: string
  }
}

// Persona data for supervisor (extracted from persona.prompt.ts for reference)
const PERSONA_NAME = 'Adam'
const PERSONA_IDENTITY = `Adam Berg, 35 let, Senior Associate v advokátní kanceláři. Perfekcionista, analytik, vyžaduje fakta a data.`
const PERSONA_WEAK_POINTS = [
  'Sociální hanba — v jeho kruzích už se nekouří',
  'V kanceláři nemůže kouřit — musí ven',
  'V autě nemůže kouřit — Q8 e-tron, kožená sedadla',
  'Doma musí na terasu — i v zimě',
  'Biohacking contradiction — suplementy vs cigarety',
  'VELO už používá v letadle',
]
const PERSONA_BAT_EXPERIENCE = `GLO: "Levný plast, mokrá sláma." VUSE: Líbí se jako tech. VELO: Používá v letadle. VEO: Fascinuje ho biohacking aspekt.`
const INITIAL_ATTITUDE = 3

/**
 * Call the supervisor model to evaluate the current state of the conversation.
 */
export async function callSupervisor(
  transcript: TranscriptMessage[],
  moodHistory: number[],
  currentAttitude: number
): Promise<BATSupervisorEvaluation> {
  const transcriptText = transcript
    .map(
      (m) =>
        `[${m.role === 'user' ? 'Hosteska' : PERSONA_NAME}]: ${m.content}`
    )
    .join('\n')

  const exchangeCount = transcript.filter(m => m.role === 'assistant').length

  const prompt = buildSupervisorPrompt({
    transcript: transcriptText,
    personaName: PERSONA_NAME,
    personaIdentity: PERSONA_IDENTITY,
    weakPoints: PERSONA_WEAK_POINTS,
    batExperience: PERSONA_BAT_EXPERIENCE,
    exchangeCount,
    moodHistory,
    currentAttitude,
    initialAttitude: INITIAL_ATTITUDE,
  })

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
 */
export { buildStateInjection }

export type { StateInjectionInput }

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
