// ============================================
// WebRTC Event Types for OpenAI Realtime API
// ============================================

/** User's speech transcription completed */
export interface TranscriptionCompletedEvent {
  type: 'conversation.item.input_audio_transcription.completed'
  item_id: string
  content_index: number
  transcript: string
}

/** AI's full audio transcript (use .done, not .delta) */
export interface AudioTranscriptDoneEvent {
  type: 'response.audio_transcript.done'
  item_id: string
  output_index: number
  content_index: number
  transcript: string
}

/** Function call arguments completed */
export interface FunctionCallEvent {
  type: 'response.function_call_arguments.done'
  item_id: string
  call_id: string
  name: string
  arguments: string
}

/** Full response completed (all output items generated) */
export interface ResponseDoneEvent {
  type: 'response.done'
  response: {
    id: string
    status: string
    output: unknown[]
  }
}

/** Error from the realtime API */
export interface RealtimeErrorEvent {
  type: 'error'
  error: {
    type: string
    code?: string
    message: string
    param?: string | null
  }
}

/** Union of all handled event types */
export type RealtimeEvent =
  | TranscriptionCompletedEvent
  | AudioTranscriptDoneEvent
  | FunctionCallEvent
  | ResponseDoneEvent
  | RealtimeErrorEvent

// ============================================
// Type Guards
// ============================================

export function isTranscriptionCompleted(
  event: { type: string }
): event is TranscriptionCompletedEvent {
  return event.type === 'conversation.item.input_audio_transcription.completed'
}

export function isAudioTranscriptDone(
  event: { type: string }
): event is AudioTranscriptDoneEvent {
  return event.type === 'response.audio_transcript.done'
}

export function isFunctionCallDone(
  event: { type: string }
): event is FunctionCallEvent {
  return event.type === 'response.function_call_arguments.done'
}

export function isResponseDone(
  event: { type: string }
): event is ResponseDoneEvent {
  return event.type === 'response.done'
}

export function isRealtimeError(
  event: { type: string }
): event is RealtimeErrorEvent {
  return event.type === 'error'
}
