import { NextResponse } from 'next/server'
import { getRealtimeToken } from '@/lib/openai'
import { buildPersonaPrompt } from '@/lib/prompt'
import { getScenario, listScenarios } from '@/lib/personas'
import { CreateSessionResponse } from '@/types'

/**
 * POST /api/session — Create a new realtime session
 * Returns ephemeral token + persona info for the client
 */
export async function POST(request: Request) {
  try {
    const { scenarioId } = await request.json()
    const scenario = getScenario(scenarioId || 'pepik_healthy')

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario not found' },
        { status: 404 }
      )
    }

    const { systemPrompt, tools } = buildPersonaPrompt(
      scenario.persona,
      scenario.goal
    )

    const { clientSecret } = await getRealtimeToken(
      systemPrompt,
      tools as unknown as Array<Record<string, unknown>>,
      scenario.persona.voice
    )

    const sessionId = crypto.randomUUID()

    const response: CreateSessionResponse = {
      sessionId,
      clientSecret,
      persona: {
        id: scenario.persona.id,
        name: scenario.persona.name,
        voice: scenario.persona.voice,
        initialAttitude: scenario.persona.initialAttitude,
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
 * GET /api/session — List available scenarios
 */
export async function GET() {
  const scenarios = listScenarios().map((s) => ({
    id: s.id,
    persona: { id: s.persona.id, name: s.persona.name },
    goal: { title: s.goal.title, description: s.goal.description },
  }))
  return NextResponse.json({ scenarios })
}
