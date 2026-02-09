// ============================================
// Core Types for BAT Sales Training Demo
// ============================================

/** Legacy Persona definition — kept for backward compatibility */
export interface Persona {
  id: string
  name: string
  age: number
  description: string
  background: string
  speechStyle: string
  initialAttitude: number // 1-10 (1 = won't budge, 10 = ready to change)
  voice: string // OpenAI realtime voice id
  traits: string[] // character traits for the prompt
  resistancePoints: string[] // things they push back on
  weakPoints: string[] // what might actually convince them
}

// ============================================
// BAT-specific Types
// ============================================

/** BAT Persona definition — modular prompt sections for tobacco shop customers */
export interface BATPersona {
  id: string
  name: string
  voice: string // OpenAI realtime voice ID
  initialAttitude: number // 0-10 starting attitude

  prompt: {
    identity: string // Who they are, background, lifestyle
    personality: string // Demeanor, tone, reactions
    speechStyle: string // How they talk, pacing, vocabulary
    samplePhrases: {
      greeting: string[]
      objections: string[]
      interested: string[]
      annoyed: string[]
      convinced: string[]
    }
    resistanceArsenal: string[] // Their excuses and pushbacks
    weakPoints: string[] // What might break through (INTERNAL)
    conversionSigns: string[] // How they show they're warming up
    batExperience: string // Their history with BAT products (prose)
  }
}

/** Compliance violation detected in salesman's speech */
export interface ComplianceViolation {
  word: string
  context: string // surrounding text
  severity: 'warning' | 'violation'
  message: string
  timestamp: number
}

/** BAT Score — post-conversation evaluation (0-10 scale) */
export interface BATScore {
  overall: number // 0-10 (weighted average)
  categories: {
    relationship: number // Budování vztahu (0-10)
    needsDiscovery: number // Zjišťování potřeb (0-10)
    productPresentation: number // Prezentace produktů (0-10)
    compliance: number // Soulad s pravidly (0-10)
  }
  complianceDetails: {
    ageVerification: 'passed' | 'skipped' | 'failed' | 'not_required'
    smokerCheck: 'passed' | 'skipped' | 'failed'
    forbiddenWords: ComplianceViolation[]
  }
  highlights: string[] // What went well
  improvements: string[] // What to improve
  fails: string[] // Critical failures
  outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
}

/** Goal definition — what the user is trying to achieve */
export interface Goal {
  id: string
  title: string
  description: string
  successCriteria: string[]
}

/** Scenario = persona + goal */
export interface Scenario {
  id: string
  persona: Persona
  goal: Goal
}

/** Transcript message */
export interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

/** Supervisor evaluation — runs during conversation */
export interface SupervisorEvaluation {
  attitude: number // 1-10 current attitude
  attitudeDirection: 'rising' | 'falling' | 'stable'
  guidance: string // natural language guidance for persona (Czech)
  topicsCovered: string[]
  isOnTrack: boolean // is persona staying in character?
  shouldEnd: boolean // should conversation end?
  endReason?: 'converted' | 'walked_away' | 'gave_up'
}

/** Post-conversation score */
export interface PostConversationScore {
  overall: number // 0-100
  categories: {
    empathy: number
    argumentQuality: number
    persistence: number
    adaptability: number
  }
  highlights: string[]
  improvements: string[]
  outcome: 'converted' | 'rejected' | 'walked_away'
  summary: string
}

/** Session state */
export interface SessionState {
  sessionId: string
  scenario: Scenario
  transcript: TranscriptMessage[]
  moodHistory: number[]
  currentAttitude: number
  status: 'idle' | 'connecting' | 'active' | 'ended'
  score?: PostConversationScore
}

/** API: Create session response */
export interface CreateSessionResponse {
  sessionId: string
  clientSecret: string
  persona: {
    id: string
    name: string
    voice: string
    initialAttitude: number
  }
}

/** API: Supervisor request */
export interface SupervisorRequest {
  transcript: TranscriptMessage[]
  moodHistory: number[]
  currentAttitude: number
  personaId: string
}

/** API: Supervisor response */
export interface SupervisorResponse {
  evaluation: SupervisorEvaluation
  stateInjection: string // pre-built block for conversation.item.create
}

/** OpenAI Realtime tool definition */
export interface ToolDefinition {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}
