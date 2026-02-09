import { NextResponse } from 'next/server'
import { getRealtimeToken } from '@/lib/openai'
import { buildPersonaPrompt, getPersonaConfig } from '@/lib/prompt'
import { CreateSessionResponse } from '@/types'

/**
 * POST /api/session — Create a new realtime session
 * Returns ephemeral token + persona info for the client
 */
export async function POST() {
  try {
    const { systemPrompt, tools, config } = buildPersonaPrompt()

    const { clientSecret } = await getRealtimeToken(
      systemPrompt,
      tools as unknown as Array<Record<string, unknown>>,
      config.voice
    )

    const sessionId = crypto.randomUUID()

    const response: CreateSessionResponse = {
      sessionId,
      clientSecret,
      persona: {
        id: config.id,
        name: config.name,
        voice: config.voice,
        initialAttitude: config.initialAttitude,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/session — Get current persona info
 */
export async function GET() {
  const config = getPersonaConfig()
  return NextResponse.json({
    persona: {
      id: config.id,
      name: config.name,
      voice: config.voice,
      initialAttitude: config.initialAttitude,
    },
  })
}
