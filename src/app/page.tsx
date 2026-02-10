'use client'

import { useEffect, useRef, useState } from 'react'
import pkg from '../../package.json'
import { useSession, DebugEvent } from '@/lib/realtime/useSession'
import type { PostConversationScore, TranscriptMessage } from '@/types'

// ============================================
// Attitude Meter
// ============================================
function AttitudeMeter({ value }: { value: number }) {
  const pct = ((value - 1) / 9) * 100

  const getColor = (v: number) => {
    if (v <= 3) return 'bg-red-500'
    if (v <= 5) return 'bg-yellow-500'
    if (v <= 7) return 'bg-orange-400'
    return 'bg-green-500'
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-12">Postoj</span>
      <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor(value)}`}
          style={{ width: `${Math.max(pct, 5)}%` }}
        />
      </div>
      <span className="text-sm font-mono text-zinc-400 w-8 text-right">
        {value}/10
      </span>
    </div>
  )
}

// ============================================
// Transcript Bubble
// ============================================
function MessageBubble({ message }: { message: TranscriptMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-zinc-800 text-zinc-200 rounded-br-sm'
            : 'bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-bl-sm'
        }`}
      >
        {!isUser && (
          <span className="text-orange-400 text-xs font-medium block mb-1">
            Adam
          </span>
        )}
        {message.content}
      </div>
    </div>
  )
}

// ============================================
// Score Category Bar
// ============================================
function ScoreBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = (value / max) * 100

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-400 w-36 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-mono text-zinc-400 w-10 text-right">
        {value}/{max}
      </span>
    </div>
  )
}

// ============================================
// Outcome Badge
// ============================================
function OutcomeBadge({
  outcome,
}: {
  outcome: PostConversationScore['outcome']
}) {
  const config = {
    converted: { label: '✅ Přesvědčen', cls: 'bg-green-900/50 text-green-400 border-green-800' },
    rejected: { label: '❌ Odmítnuto', cls: 'bg-red-900/50 text-red-400 border-red-800' },
    walked_away: { label: '🚪 Odešel', cls: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
    compliance_fail: { label: '⚠️ Porušení pravidel', cls: 'bg-orange-900/50 text-orange-400 border-orange-800' },
  }

  const { label, cls } = config[outcome]

  return (
    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium border ${cls}`}>
      {label}
    </span>
  )
}

// ============================================
// Idle Screen
// ============================================ 
function IdleScreen({ onStart, userName }: { onStart: () => void; userName: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-lg w-full">
        <h1 className="text-4xl font-bold mb-2">BAT Sales Trainer</h1>
        <p className="text-zinc-500 text-sm mb-8">
          Trénink oslovení zákazníka v trafice. Nabídni mu BAT alternativy.
        </p>

        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 text-left mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl">
              👔
            </div>
            <div>
              <h2 className="text-lg font-semibold">Adam Berg, 35 let</h2>
              <p className="text-zinc-500 text-sm">Právník · Perfekcionista · Dunhill</p>
            </div>
          </div>

          <p className="text-zinc-400 text-sm mb-2">
            Skeptický zákazník. Kouří Dunhilly, jezdí Audi Q8, vyžaduje fakta.
            Neslyší na slogany, ale zasáhne ho sociální tlak a praktické argumenty.
          </p>

          <div className="bg-zinc-800/50 rounded-lg p-3 mb-5">
            <p className="text-orange-400 text-xs font-medium mb-1">🎯 Tvůj cíl</p>
            <p className="text-zinc-300 text-sm">
              Ověř věk a kouření, pak nabídni GLO, VELO nebo Vuse. Přesvědč ho fakty, ne frázemi.
            </p>
          </div>

          <button
            onClick={onStart}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3.5 px-8 rounded-xl transition-colors text-lg"
          >
            🎙 Začít rozhovor
          </button>
        </div>

        <p className="text-zinc-700 text-xs mt-6">
          BAT Sales Training Demo
        </p>
      </div>
    </div>
  )
}

// ============================================
// Active Screen
// ============================================
function ActiveScreen({
  transcript,
  currentAttitude,
  onEnd,
}: {
  transcript: TranscriptMessage[]
  currentAttitude: number
  onEnd: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [transcript])

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-zinc-400">Připojeno</span>
          </div>
          <span className="text-xs text-zinc-600">👔 Adam Berg</span>
        </div>
        <AttitudeMeter value={currentAttitude} />
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        {transcript.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-600 text-sm">Mluvte... Adam poslouchá 🎧</p>
          </div>
        )}
        {transcript.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={onEnd}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium py-3 px-6 rounded-xl transition-colors"
        >
          Ukončit rozhovor
        </button>
      </div>
    </div>
  )
}

// ============================================
// Connecting Screen
// ============================================
function ConnectingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400">Připojování…</p>
        <p className="text-zinc-600 text-sm mt-1">Povolte přístup k mikrofonu</p>
      </div>
    </div>
  )
}

// ============================================
// Scoring Loading Screen
// ============================================
function ScoringScreen({
  transcript,
  moodHistory,
  currentAttitude,
}: {
  transcript: TranscriptMessage[]
  moodHistory: number[]
  currentAttitude: number
}) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  const userMessages = transcript.filter((m) => m.role === 'user').length
  const assistantMessages = transcript.filter((m) => m.role === 'assistant').length
  const duration = transcript.length > 0
    ? Math.round((transcript[transcript.length - 1].timestamp - transcript[0].timestamp) / 1000)
    : 0
  const durationStr = duration > 60 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : `${duration}s`

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-lg w-full">
        {/* Analyzing header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-200">Vyhodnocuji výkon{dots}</h2>
          <p className="text-zinc-500 text-sm mt-1">AI analyzuje tvůj přístup</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-orange-500">{userMessages + assistantMessages}</div>
            <div className="text-xs text-zinc-500 mt-1">Výměn</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-orange-500">{durationStr}</div>
            <div className="text-xs text-zinc-500 mt-1">Délka</div>
          </div>
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
            <div className="text-2xl font-bold text-orange-500">{currentAttitude}/10</div>
            <div className="text-xs text-zinc-500 mt-1">Finální postoj</div>
          </div>
        </div>

        {/* Mood graph */}
        {moodHistory.length > 1 && (
          <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 mb-4">
            <p className="text-xs text-zinc-500 mb-2">Průběh nálady</p>
            <div className="flex items-end gap-1 h-16">
              {moodHistory.map((mood, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all duration-500 ${
                    mood <= 3 ? 'bg-red-500' : mood <= 5 ? 'bg-yellow-500' : mood <= 7 ? 'bg-orange-400' : 'bg-green-500'
                  }`}
                  style={{ height: `${(mood / 10) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-600">Začátek</span>
              <span className="text-[10px] text-zinc-600">Konec</span>
            </div>
          </div>
        )}

        {/* Skeleton score preview */}
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 space-y-3 animate-pulse">
          <div className="h-3 bg-zinc-800 rounded w-3/4" />
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-2/3" />
          <div className="h-3 bg-zinc-800 rounded w-5/6" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Ended Screen
// ============================================
function EndedScreen({
  score,
  transcript,
  moodHistory,
  currentAttitude,
  onRetry,
}: {
  score: PostConversationScore | null
  transcript: TranscriptMessage[]
  moodHistory: number[]
  currentAttitude: number
  onRetry: () => void
}) {
  if (!score) {
    return (
      <ScoringScreen
        transcript={transcript}
        moodHistory={moodHistory}
        currentAttitude={currentAttitude}
      />
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Výsledek</h2>
          <OutcomeBadge outcome={score.outcome} />
        </div>

        {/* Overall Score */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-4 text-center">
          <div className="text-6xl font-bold text-orange-500 mb-1">
            {score.overall}%
          </div>
          <p className="text-zinc-500 text-sm">celkové skóre</p>
        </div>

        {/* Category Scores */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-4 space-y-3">
          <ScoreBar label="Budování vztahu" value={score.categories.relationship} />
          <ScoreBar label="Zjišťování potřeb" value={score.categories.needsDiscovery} />
          <ScoreBar label="Prezentace produktů" value={score.categories.productPresentation} />
          <ScoreBar label="Soulad s pravidly" value={score.categories.compliance} />
        </div>

        {/* Highlights → Improvements → Fails */}
        <div className="space-y-4 mb-6">
          {score.highlights.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <h3 className="text-green-400 text-xs font-medium mb-2">Co se povedlo</h3>
              <ul className="space-y-1.5">
                {score.highlights.map((h, i) => (
                  <li key={i} className="text-zinc-400 text-sm flex gap-2">
                    <span className="text-green-600 shrink-0">+</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.improvements.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <h3 className="text-orange-400 text-xs font-medium mb-2">Tipy na zlepšení</h3>
              <ul className="space-y-1.5">
                {score.improvements.map((imp, i) => (
                  <li key={i} className="text-zinc-400 text-sm flex gap-2">
                    <span className="text-orange-600 shrink-0">→</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.fails.length > 0 && (
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
              <h3 className="text-red-400 text-xs font-medium mb-2">Chyby</h3>
              <ul className="space-y-1.5">
                {score.fails.map((f, i) => (
                  <li key={i} className="text-zinc-400 text-sm flex gap-2">
                    <span className="text-red-600 shrink-0">-</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Retry */}
        <button
          onClick={onRetry}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold py-3.5 px-8 rounded-xl transition-colors mb-4"
        >
          Zkusit znovu
        </button>

      </div>
    </div>
  )
}

// ============================================
// Debug Panel
// ============================================
function DebugPanel({ events, moodHistory, transcript }: { events: DebugEvent[]; moodHistory: number[]; transcript: TranscriptMessage[] }) {
  const [copied, setCopied] = useState(false)

  const formatTranscriptForCopy = () => {
    return transcript
      .map((m) => `[${m.role === 'user' ? 'Hosteska' : 'Zákazník'}]: ${m.content}`)
      .join('\n')
  }

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(formatTranscriptForCopy())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = formatTranscriptForCopy()
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
  }

  const typeColors: Record<string, string> = {
    supervisor: 'text-blue-400',
    state_injection: 'text-purple-400',
    function_call: 'text-yellow-400',
    error: 'text-red-400',
    connected: 'text-green-400',
  }

  const typeLabels: Record<string, string> = {
    supervisor: '🧠 SUPERVISOR',
    state_injection: '💉 INJECTION',
    function_call: '⚡ TOOL CALL',
    error: '❌ ERROR',
    connected: '🟢 CONNECTED',
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Mood graph */}
      {moodHistory.length > 1 && (
        <div className="px-4 pt-3 pb-2 border-b border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1.5">Průběh nálady</p>
          <div className="flex items-end gap-1 h-10">
            {moodHistory.map((mood, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t transition-all duration-300 ${
                  mood <= 3 ? 'bg-red-500' : mood <= 5 ? 'bg-yellow-500' : mood <= 7 ? 'bg-orange-400' : 'bg-green-500'
                }`}
                style={{ height: `${(mood / 10) * 100}%` }}
                title={`${mood}/10`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Transcript log */}
      {transcript.length > 0 && (
        <div className="border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <p className="text-xs text-zinc-500">Transcript ({transcript.length})</p>
            <button
              onClick={copyTranscript}
              className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
            >
              {copied ? 'Zkopirováno!' : 'Kopírovat'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto px-4 pb-3 space-y-1">
            {transcript.map((m, i) => (
              <div key={i} className="text-[11px]">
                <span className={m.role === 'user' ? 'text-emerald-400' : 'text-sky-400'}>
                  [{m.role === 'user' ? 'Hosteska' : 'Zákazník'}]
                </span>{' '}
                <span className="text-zinc-300">{m.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events log */}
      <div ref={scrollRef} className="max-h-80 overflow-y-auto p-3 space-y-2">
        {events.length === 0 && (
          <p className="text-zinc-600 text-xs text-center py-4">Zatím žádné události…</p>
        )}
        {events.map((event, i) => (
          <div key={i} className="text-xs">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-zinc-600 font-mono">{formatTime(event.timestamp)}</span>
              <span className={`font-medium ${typeColors[event.type] || 'text-zinc-400'}`}>
                {typeLabels[event.type] || event.type}
              </span>
            </div>
            {event.type === 'supervisor' && (() => {
              const d = event.data as {
                attitude?: number
                attitudeDirection?: string
                guidance?: string
                topicsCovered?: string[]
                isOnTrack?: boolean
                shouldEnd?: boolean
              }
              return (
                <div className="ml-4 pl-2 border-l border-zinc-800 space-y-0.5">
                  <p className="text-zinc-300">
                    Postoj: <span className="font-bold">{d.attitude}/10</span>{' '}
                    <span className="text-zinc-500">
                      ({d.attitudeDirection === 'rising' ? '📈' : d.attitudeDirection === 'falling' ? '📉' : '➡️'})
                    </span>
                    {!d.isOnTrack && <span className="text-red-400 ml-1">⚠️ OFF TRACK</span>}
                  </p>
                  {d.guidance && (
                    <p className="text-zinc-400 italic">&quot;{d.guidance}&quot;</p>
                  )}
                  {d.topicsCovered && d.topicsCovered.length > 0 && (
                    <p className="text-zinc-500">Témata: {d.topicsCovered.join(', ')}</p>
                  )}
                </div>
              )
            })()}
            {event.type === 'state_injection' && (
              <pre className="ml-4 pl-2 border-l border-zinc-800 text-zinc-500 whitespace-pre-wrap text-[10px] leading-tight">
                {String(event.data)}
              </pre>
            )}
            {event.type === 'function_call' && (
              <div className="ml-4 pl-2 border-l border-zinc-800">
                <p className="text-zinc-300">
                  {(event.data as { name?: string })?.name}: {(event.data as { args?: string })?.args}
                </p>
              </div>
            )}
            {event.type === 'error' && (
              <div className="ml-4 pl-2 border-l border-red-900">
                <p className="text-red-400">{(event.data as { message?: string })?.message}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// Login Screen
// ============================================
function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length >= 2) {
      localStorage.setItem('ai-convince-username', trimmed)
      onLogin(trimmed)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center max-w-sm w-full">
        <h1 className="text-4xl font-bold mb-2">🎯 AI Convince</h1>
        <p className="text-zinc-500 text-sm mb-8">
          Přesvědč AI postavu, že by měla změnit svůj životní styl.
        </p>
        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <label className="block text-zinc-400 text-sm mb-2 text-left">Tvoje jméno</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Např. Lubos"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors mb-4"
            minLength={2}
            maxLength={30}
          />
          <button
            type="submit"
            disabled={name.trim().length < 2}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Pokračovat
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================
// Main Page
// ============================================
export default function Home() {
  const [userName, setUserName] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  // Check localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ai-convince-username')
    if (stored) setUserName(stored)
  }, [])

  if (!userName) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <LoginScreen onLogin={setUserName} />
      </main>
    )
  }

  return <SessionPage userName={userName} showDebug={showDebug} setShowDebug={setShowDebug} onLogout={() => {
    localStorage.removeItem('ai-convince-username')
    setUserName(null)
  }} />
}

function SessionPage({ userName, showDebug, setShowDebug, onLogout }: {
  userName: string
  showDebug: boolean
  setShowDebug: React.Dispatch<React.SetStateAction<boolean>>
  onLogout: () => void
}) {
  const session = useSession(userName)

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* User badge */}
      <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
        <span className="text-zinc-500 text-xs">{userName}</span>
        <button
          onClick={onLogout}
          className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {session.status === 'idle' && (
        <IdleScreen onStart={session.startSession} userName={userName} />
      )}
      {session.status === 'connecting' && <ConnectingScreen />}
      {session.status === 'active' && (
        <div className="flex h-screen">
          <div className={`${showDebug ? 'flex-1' : 'w-full max-w-2xl mx-auto'} transition-all`}>
            <ActiveScreen
              transcript={session.transcript}
              currentAttitude={session.currentAttitude}
              onEnd={session.endSession}
            />
          </div>
          {showDebug && (
            <div className="w-96 border-l border-zinc-800 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">🐛 Debug Panel</h3>
              <DebugPanel events={session.debugEvents} moodHistory={session.moodHistory} transcript={session.transcript} />
            </div>
          )}
        </div>
      )}
      {session.status === 'ended' && (
        <div className="flex min-h-screen">
          <div className={`${showDebug ? 'flex-1' : 'w-full'} transition-all`}>
            <EndedScreen
              score={session.score}
              transcript={session.transcript}
              moodHistory={session.moodHistory}
              currentAttitude={session.currentAttitude}
              onRetry={session.startSession}
            />
          </div>
          {showDebug && (
            <div className="w-96 border-l border-zinc-800 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">🐛 Debug Panel</h3>
              <DebugPanel events={session.debugEvents} moodHistory={session.moodHistory} transcript={session.transcript} />
            </div>
          )}
        </div>
      )}

      {/* Debug toggle */}
      {(session.status === 'active' || session.status === 'ended') && (
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="fixed bottom-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors z-50"
        >
          {showDebug ? '🐛 Hide Debug' : '🐛 Debug'} <span className="text-zinc-600 ml-1">v{pkg.version}</span>
        </button>
      )}
    </main>
  )
}
