import OpenAI from 'openai'

export const MODELS = {
  REALTIME: 'gpt-4o-realtime-preview-2025-06-03',
  SUPERVISOR: 'gpt-4.1',
  SCORING: 'gpt-4.1',
} as const

// Lazy init — avoid crashing at build time when env vars aren't set
let _openai: OpenAI | null = null
export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/** @deprecated Use getOpenAI() instead */
export const openai = undefined as unknown as OpenAI

/**
 * Get an ephemeral token for the Realtime API via WebRTC.
 * The token is short-lived and scoped to a single session.
 */
export async function getRealtimeToken(
  instructions: string,
  tools: Array<Record<string, unknown>>,
  voice: string = 'ash'
): Promise<{ clientSecret: string }> {
  // Use REST API directly — the SDK types for realtime may lag behind
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.REALTIME,
      voice,
      instructions,
      tools,
      input_audio_transcription: { model: 'gpt-4o-mini-transcribe', language: 'cs' },
      turn_detection: { type: 'server_vad' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Realtime session creation failed: ${response.status} ${err}`)
  }

  const data = await response.json()
  return {
    clientSecret: data.client_secret.value,
  }
}
