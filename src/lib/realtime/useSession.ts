'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { RealtimeClient } from './client'
import type {
  TranscriptMessage,
  CreateSessionResponse,
  SupervisorRequest,
  SupervisorResponse,
  PostConversationScore,
} from '@/types'

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'ended'

export interface DebugEvent {
  timestamp: number
  type: 'supervisor' | 'state_injection' | 'function_call' | 'error' | 'connected'
  data: unknown
}

export interface SessionHook {
  status: SessionStatus
  transcript: TranscriptMessage[]
  currentAttitude: number
  moodHistory: number[]
  score: PostConversationScore | null
  personaName: string
  debugEvents: DebugEvent[]
  startSession: () => Promise<void>
  endSession: () => Promise<void>
}

const SUPERVISOR_DEBOUNCE_MS = 2000
const SUPERVISOR_MIN_INTERVAL_MS = 5000

export function useSession(userName: string): SessionHook {
  const saveSession = useMutation(api.sessions.save)
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [currentAttitude, setCurrentAttitude] = useState(2)
  const [moodHistory, setMoodHistory] = useState<number[]>([2])
  const [score, setScore] = useState<PostConversationScore | null>(null)
  const [personaName, setPersonaName] = useState('Pepík')
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([])

  const addDebugEvent = useCallback((type: DebugEvent['type'], data: unknown) => {
    const event = { timestamp: Date.now(), type, data }
    debugEventsRef.current = [...debugEventsRef.current, event]
    setDebugEvents((prev) => [...prev, event])
  }, [])

  const clientRef = useRef<RealtimeClient | null>(null)
  const personaIdRef = useRef('pepik')
  const sessionStartRef = useRef(0)
  const supervisorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSupervisorCallRef = useRef(0)
  const endingRef = useRef(false)
  const pendingEndRef = useRef<'converted' | 'rejected' | 'walked_away' | null>(null)
  const endTriggerRef = useRef<string>('unknown')
  const debugEventsRef = useRef<DebugEvent[]>([])

  // Refs to hold latest state for callbacks (avoids stale closures)
  const transcriptRef = useRef<TranscriptMessage[]>([])
  const attitudeRef = useRef(2)
  const moodHistoryRef = useRef<number[]>([2])

  /** Call supervisor API, inject state back into realtime */
  const callSupervisor = useCallback(async () => {
    const now = Date.now()
    const elapsed = now - lastSupervisorCallRef.current
    if (elapsed < SUPERVISOR_MIN_INTERVAL_MS) return
    if (transcriptRef.current.length < 2) return
    if (endingRef.current) return

    lastSupervisorCallRef.current = now

    try {
      const req: SupervisorRequest = {
        transcript: transcriptRef.current,
        moodHistory: moodHistoryRef.current,
        currentAttitude: attitudeRef.current,
        personaId: personaIdRef.current,
      }

      const res = await fetch('/api/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      })

      if (!res.ok) {
        console.error('[supervisor] error:', res.status)
        return
      }

      const data: SupervisorResponse = await res.json()
      const { evaluation, stateInjection } = data

      // Log supervisor evaluation
      addDebugEvent('supervisor', evaluation)

      // Update attitude
      setCurrentAttitude(evaluation.attitude)
      attitudeRef.current = evaluation.attitude

      // Track mood history
      setMoodHistory((prev) => {
        const next = [...prev, evaluation.attitude]
        moodHistoryRef.current = next
        return next
      })

      // Inject state into realtime session
      if (clientRef.current && stateInjection) {
        clientRef.current.injectState(stateInjection)
        addDebugEvent('state_injection', stateInjection)
      }

      // If supervisor says to end, force the model to respond with farewell
      // State injection has 🔴 UKONČI ROZHOVOR — trigger response.create so model acts on it NOW
      if (evaluation.shouldEnd && evaluation.endReason && !pendingEndRef.current) {
        const reasonMap: Record<string, 'converted' | 'rejected' | 'walked_away'> = {
          converted: 'converted',
          walked_away: 'walked_away',
          gave_up: 'rejected',
        }
        endTriggerRef.current = `supervisor:${evaluation.endReason}`
        addDebugEvent('supervisor', { action: 'ending', reason: evaluation.endReason, attitude: evaluation.attitude })

        // Force the model to respond immediately (reads the end instruction + says farewell)
        if (clientRef.current) {
          clientRef.current.triggerResponse()
        }

        // Safety timeout: if model doesn't call end_conversation within 15s, force end
        setTimeout(() => {
          if (!endingRef.current) {
            addDebugEvent('supervisor', { action: 'force_end', reason: 'model did not call end_conversation in time' })
            handleEnd(reasonMap[evaluation.endReason!] ?? 'rejected')
          }
        }, 15000)
      }
    } catch (err) {
      console.error('[supervisor] call failed:', err)
    }
  }, [])

  /** Schedule supervisor call with debounce */
  const scheduleSupervisor = useCallback(() => {
    if (supervisorTimerRef.current) {
      clearTimeout(supervisorTimerRef.current)
    }
    supervisorTimerRef.current = setTimeout(() => {
      callSupervisor()
    }, SUPERVISOR_DEBOUNCE_MS)
  }, [callSupervisor])

  /** Handle conversation end — score and cleanup */
  const handleEnd = useCallback(
    async (outcome: 'converted' | 'rejected' | 'walked_away') => {
      if (endingRef.current) return
      endingRef.current = true

      // Show scoring screen immediately
      setStatus('ended')

      // Clear supervisor timer
      if (supervisorTimerRef.current) {
        clearTimeout(supervisorTimerRef.current)
        supervisorTimerRef.current = null
      }

      // Disconnect client
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }

      // Score the session
      let scoreData: PostConversationScore | null = null
      try {
        const res = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcriptRef.current,
            personaId: personaIdRef.current,
            outcome,
          }),
        })

        if (res.ok) {
          scoreData = await res.json()
          setScore(scoreData)
        }
      } catch (err) {
        console.error('[scoring] failed:', err)
      }

      // Save to Convex
      try {
        const exchangeCount = transcriptRef.current.filter(
          (m) => m.role === 'assistant'
        ).length
        await saveSession({
          userName,
          personaId: personaIdRef.current,
          personaName: 'Pepík',
          outcome,
          transcript: transcriptRef.current,
          moodHistory: moodHistoryRef.current,
          finalAttitude: attitudeRef.current,
          score: scoreData
            ? {
                overall: scoreData.overall,
                categories: scoreData.categories,
                highlights: scoreData.highlights,
                improvements: scoreData.improvements,
                summary: scoreData.summary,
              }
            : undefined,
          debugEvents: debugEventsRef.current.map((e) => ({
            timestamp: e.timestamp,
            type: e.type,
            data: e.data,
          })),
          endTrigger: endTriggerRef.current,
          durationMs: Date.now() - sessionStartRef.current,
          exchangeCount,
        })
      } catch (err) {
        console.error('[convex] save failed:', err)
      }

    },
    []
  )

  /** Add a message to the transcript */
  const addMessage = useCallback(
    (role: 'user' | 'assistant', content: string) => {
      const msg: TranscriptMessage = {
        role,
        content,
        timestamp: Date.now(),
      }
      setTranscript((prev) => {
        const next = [...prev, msg]
        transcriptRef.current = next
        return next
      })

      // Schedule supervisor after assistant messages
      if (role === 'assistant') {
        scheduleSupervisor()
      }
    },
    [scheduleSupervisor]
  )

  /** Start a new session */
  const startSession = useCallback(async () => {
    // Reset state
    setStatus('connecting')
    setTranscript([])
    setScore(null)
    setDebugEvents([])
    setMoodHistory([2])
    setCurrentAttitude(2)
    transcriptRef.current = []
    attitudeRef.current = 2
    moodHistoryRef.current = [2]
    endingRef.current = false
    lastSupervisorCallRef.current = 0
    sessionStartRef.current = Date.now()

    try {
      // Get ephemeral token
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'pepik_healthy' }),
      })

      if (!res.ok) throw new Error(`Session API error: ${res.status}`)

      const data: CreateSessionResponse = await res.json()
      personaIdRef.current = data.persona.id
      setPersonaName(data.persona.name)
      setCurrentAttitude(data.persona.initialAttitude)
      attitudeRef.current = data.persona.initialAttitude
      moodHistoryRef.current = [data.persona.initialAttitude]
      setMoodHistory([data.persona.initialAttitude])

      // Create WebRTC client
      const client = new RealtimeClient({
        onUserTranscript: (_itemId, text) => {
          addMessage('user', text)
        },
        onAssistantTranscript: (_itemId, text) => {
          addMessage('assistant', text)
        },
        onFunctionCall: (name, args, callId) => {
          addDebugEvent('function_call', { name, args })
          if (name === 'end_conversation') {
            let reason: 'converted' | 'rejected' | 'walked_away' = 'rejected'
            try {
              const parsed = JSON.parse(args)
              if (
                parsed.reason === 'converted' ||
                parsed.reason === 'walked_away'
              ) {
                reason = parsed.reason
              }
            } catch {
              // default to rejected
            }
            endTriggerRef.current = `end_conversation:${reason}`
            addDebugEvent('function_call', { name, reason, action: 'waiting_for_audio' })
            // Don't send function result — farewell is already in this response
            // Just wait for audio playback to finish, then disconnect
            setTimeout(() => {
              handleEnd(reason)
            }, 5000)
          }
        },
        onResponseDone: () => {
          // Available for future use (e.g. tracking response completion)
        },
        onError: (error) => {
          console.error('[session] realtime error:', error.message)
          addDebugEvent('error', error)
        },
        onConnected: () => {
          setStatus('active')
          addDebugEvent('connected', { time: new Date().toISOString() })
        },
        onDisconnected: () => {
          if (!endingRef.current) {
            endTriggerRef.current = 'disconnect'
            handleEnd('walked_away')
          }
        },
      })

      clientRef.current = client
      await client.connect(data.clientSecret)
    } catch (err) {
      console.error('[session] start failed:', err)
      setStatus('idle')
    }
  }, [addMessage, handleEnd])

  /** End session early (user-initiated) */
  const endSession = useCallback(async () => {
    await handleEnd('walked_away')
  }, [handleEnd])

  return {
    status,
    transcript,
    currentAttitude,
    moodHistory,
    score,
    personaName,
    debugEvents,
    startSession,
    endSession,
  }
}
