import { NextResponse } from 'next/server'
import { scoreSession } from '@/lib/scoring'
import { personas } from '@/lib/personas'
import { TranscriptMessage } from '@/types'

/**
 * POST /api/score — Score a completed session
 * Called after conversation ends
 */
export async function POST(request: Request) {
  try {
    const {
      transcript,
      personaId,
      outcome,
    }: {
      transcript: TranscriptMessage[]
      personaId: string
      outcome: 'converted' | 'rejected' | 'walked_away'
    } = await request.json()

    const persona = personas[personaId]
    if (!persona) {
      return NextResponse.json(
        { error: 'Persona not found' },
        { status: 404 }
      )
    }

    const score = await scoreSession(transcript, persona, outcome)
    return NextResponse.json(score)
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json(
      { error: 'Scoring failed' },
      { status: 500 }
    )
  }
}
