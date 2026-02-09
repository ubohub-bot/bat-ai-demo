import { NextResponse } from 'next/server'
import { callSupervisor, buildStateInjection } from '@/lib/supervisor'
import { SupervisorRequest, SupervisorResponse } from '@/types'

/**
 * POST /api/supervisor — Evaluate conversation state
 * Called client-side after each exchange (debounced)
 * Returns evaluation + pre-built state injection block
 */
export async function POST(request: Request) {
  try {
    const body: SupervisorRequest = await request.json()
    const { transcript, moodHistory, currentAttitude } = body

    const evaluation = await callSupervisor(
      transcript,
      moodHistory,
      currentAttitude
    )

    // Count exchanges (assistant turns)
    const exchangeCount = transcript.filter(m => m.role === 'assistant').length

    const stateInjection = buildStateInjection({
      attitude: evaluation.attitude,
      attitudeDirection: evaluation.attitudeDirection,
      guidance: evaluation.guidance,
      exchangeCount,
      isOnTrack: evaluation.isOnTrack,
      shouldEnd: evaluation.shouldEnd,
      endReason: evaluation.endReason,
      compliance: evaluation.compliance,
    })

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
