import { NextResponse } from 'next/server'
import { callSupervisor, buildStateInjection } from '@/lib/supervisor'
import { personas } from '@/lib/personas'
import { SupervisorRequest, SupervisorResponse } from '@/types'

/**
 * POST /api/supervisor — Evaluate conversation state
 * Called client-side after each exchange (debounced)
 * Returns evaluation + pre-built state injection block
 */
export async function POST(request: Request) {
  try {
    const body: SupervisorRequest = await request.json()
    const { transcript, moodHistory, currentAttitude, personaId } = body

    const persona = personas[personaId]
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }

    const evaluation = await callSupervisor(
      transcript,
      moodHistory,
      currentAttitude,
      persona
    )

    const stateInjection = buildStateInjection(evaluation)

    const response: SupervisorResponse = {
      evaluation,
      stateInjection,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Supervisor error:', error)
    return NextResponse.json(
      { error: 'Supervisor evaluation failed' },
      { status: 500 }
    )
  }
}
