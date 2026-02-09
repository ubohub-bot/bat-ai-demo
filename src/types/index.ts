// ============================================
// Core Types for AI Convince Demo
// ============================================

/** Persona definition — the AI character the user talks to */
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
