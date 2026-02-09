'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const outcomeLabel: Record<string, { text: string; cls: string }> = {
  converted: { text: '✅ Přesvědčen', cls: 'text-green-400' },
  rejected: { text: '❌ Odmítnuto', cls: 'text-red-400' },
  walked_away: { text: '🚪 Odešel', cls: 'text-yellow-400' },
}

export default function AdminPage() {
  const users = useQuery(api.sessions.listUsers)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const sessions = useQuery(
    api.sessions.getByUser,
    selectedUser ? { userName: selectedUser } : 'skip'
  )
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">🎯 AI Convince — Admin</h1>
            <p className="text-zinc-500 text-sm mt-1">Session history & user performance</p>
          </div>
          <a
            href="/"
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            ← Zpět na demo
          </a>
        </div>

        <div className="flex gap-6">
          {/* User List */}
          <div className="w-72 shrink-0">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">Uživatelé</h2>
            {!users ? (
              <p className="text-zinc-600 text-sm">Načítám...</p>
            ) : users.length === 0 ? (
              <p className="text-zinc-600 text-sm">Zatím žádné sessions.</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <button
                    key={user.userName}
                    onClick={() => {
                      setSelectedUser(user.userName)
                      setExpandedSession(null)
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedUser === user.userName
                        ? 'bg-zinc-800 border-orange-500/50'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{user.userName}</span>
                      <span className="text-zinc-500 text-xs">{user.count}×</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-zinc-500 text-xs">
                        Best: {user.bestScore || '—'}
                      </span>
                      <span className="text-zinc-600 text-xs">
                        {formatDate(user.lastSession)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Session List */}
          <div className="flex-1 min-w-0">
            {!selectedUser ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-zinc-600">← Vyber uživatele</p>
              </div>
            ) : !sessions ? (
              <p className="text-zinc-600">Načítám sessions...</p>
            ) : sessions.length === 0 ? (
              <p className="text-zinc-600">Žádné sessions pro {selectedUser}.</p>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-zinc-400 mb-3">
                  Sessions — {selectedUser} ({sessions.length})
                </h2>
                {sessions.map((s) => {
                  const oc = outcomeLabel[s.outcome] || { text: s.outcome, cls: 'text-zinc-400' }
                  const isExpanded = expandedSession === s._id

                  return (
                    <div
                      key={s._id}
                      className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
                    >
                      {/* Session header */}
                      <button
                        onClick={() =>
                          setExpandedSession(isExpanded ? null : s._id)
                        }
                        className="w-full text-left p-4 hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-medium ${oc.cls}`}>
                              {oc.text}
                            </span>
                            <span className="text-zinc-500 text-sm">
                              Score: {s.score?.overall ?? '—'}
                            </span>
                            {s.endTrigger && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                                {s.endTrigger}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>{s.exchangeCount} výměn</span>
                            <span>{formatDuration(s.durationMs)}</span>
                            <span>{formatDate(s._creationTime)}</span>
                            <span>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </div>
                        {/* Mood sparkline */}
                        <div className="flex items-end gap-0.5 h-4 mt-2">
                          {s.moodHistory.map((mood, i) => (
                            <div
                              key={i}
                              className={`flex-1 max-w-2 rounded-t ${
                                mood <= 3
                                  ? 'bg-red-500'
                                  : mood <= 5
                                    ? 'bg-yellow-500'
                                    : mood <= 7
                                      ? 'bg-orange-400'
                                      : 'bg-green-500'
                              }`}
                              style={{ height: `${(mood / 10) * 100}%` }}
                            />
                          ))}
                        </div>
                      </button>

                      {/* Expanded: transcript + scores */}
                      {isExpanded && (
                        <div className="border-t border-zinc-800 p-4">
                          {/* Score breakdown */}
                          {s.score && (
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              {[
                                { label: 'Empatie', val: s.score.categories.empathy },
                                { label: 'Argumenty', val: s.score.categories.argumentQuality },
                                { label: 'Vytrvalost', val: s.score.categories.persistence },
                                { label: 'Adaptabilita', val: s.score.categories.adaptability },
                              ].map((cat) => (
                                <div
                                  key={cat.label}
                                  className="bg-zinc-800 rounded-lg p-2 text-center"
                                >
                                  <div className="text-lg font-bold text-orange-400">
                                    {cat.val}
                                  </div>
                                  <div className="text-xs text-zinc-500">{cat.label}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Summary */}
                          {s.score?.summary && (
                            <p className="text-zinc-400 text-sm mb-4 italic">
                              {s.score.summary}
                            </p>
                          )}

                          {/* Debug Events */}
                          {s.debugEvents && s.debugEvents.length > 0 && (
                            <details className="mb-4">
                              <summary className="text-xs font-medium text-zinc-500 cursor-pointer hover:text-zinc-400">
                                🔍 Debug Events ({s.debugEvents.length})
                              </summary>
                              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                                {s.debugEvents.map((ev, i) => (
                                  <div
                                    key={i}
                                    className="flex gap-2 text-xs font-mono bg-zinc-800/50 px-2 py-1 rounded"
                                  >
                                    <span className="text-zinc-600 shrink-0">
                                      {new Date(ev.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <span className={`shrink-0 ${
                                      ev.type === 'supervisor' ? 'text-blue-400' :
                                      ev.type === 'function_call' ? 'text-orange-400' :
                                      ev.type === 'state_injection' ? 'text-purple-400' :
                                      ev.type === 'error' ? 'text-red-400' :
                                      'text-zinc-400'
                                    }`}>
                                      {ev.type}
                                    </span>
                                    <span className="text-zinc-500 truncate">
                                      {typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}

                          {/* Transcript */}
                          <h3 className="text-xs font-medium text-zinc-500 mb-2">
                            Přepis rozhovoru
                          </h3>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {s.transcript.map((msg, i) => (
                              <div
                                key={i}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                                    msg.role === 'user'
                                      ? 'bg-zinc-800 text-zinc-300'
                                      : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700'
                                  }`}
                                >
                                  {msg.role === 'assistant' && (
                                    <span className="text-orange-400 text-xs block mb-0.5">
                                      Pepík
                                    </span>
                                  )}
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
