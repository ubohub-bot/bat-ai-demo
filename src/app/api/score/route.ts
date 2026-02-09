import { NextResponse } from 'next/server'
import { scoreSession } from '@/lib/scoring'
import { TranscriptMessage } from '@/types'

/**
 * POST /api/score — Score a completed session
 * Called after conversation ends
 */
export async function POST(request: Request) {
  try {
    const {
      transcript,
      outcome,
    }: {
      transcript: TranscriptMessage[]
      outcome: 'converted' | 'rejected' | 'walked_away' | 'compliance_fail'
    } = await request.json()

    const score = await scoreSession(transcript, outcome)
    return NextResponse.json(score)
  } catch (error) {
    console.error('Scoring error:', error)
    return NextResponse.json(
      { error: 'Scoring failed' },
      { status: 500 }
    )
  }
}
