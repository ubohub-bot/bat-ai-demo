import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

/** Save a completed session */
export const save = mutation({
  args: {
    userName: v.string(),
    personaId: v.string(),
    personaName: v.string(),
    outcome: v.string(),
    transcript: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    moodHistory: v.array(v.number()),
    finalAttitude: v.number(),
    score: v.optional(
      v.object({
        overall: v.number(),
        categories: v.object({
          empathy: v.number(),
          argumentQuality: v.number(),
          persistence: v.number(),
          adaptability: v.number(),
        }),
        highlights: v.array(v.string()),
        improvements: v.array(v.string()),
        summary: v.string(),
      })
    ),
    debugEvents: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          type: v.string(),
          data: v.any(),
        })
      )
    ),
    endTrigger: v.optional(v.string()),
    durationMs: v.number(),
    exchangeCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('sessions', args)
  },
})

/** Get all sessions for a specific user */
export const getByUser = query({
  args: { userName: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userName', args.userName))
      .order('desc')
      .collect()
  },
})

/** Get all sessions (admin view) */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('sessions').order('desc').take(100)
  },
})

/** Get unique usernames with session counts */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query('sessions').collect()
    const userMap = new Map<
      string,
      { count: number; lastSession: number; bestScore: number }
    >()

    for (const s of sessions) {
      const existing = userMap.get(s.userName)
      const score = s.score?.overall ?? 0
      if (existing) {
        existing.count++
        existing.lastSession = Math.max(
          existing.lastSession,
          s._creationTime
        )
        existing.bestScore = Math.max(existing.bestScore, score)
      } else {
        userMap.set(s.userName, {
          count: 1,
          lastSession: s._creationTime,
          bestScore: score,
        })
      }
    }

    return Array.from(userMap.entries())
      .map(([name, data]) => ({
        userName: name,
        ...data,
      }))
      .sort((a, b) => b.lastSession - a.lastSession)
  },
})

/** Leaderboard: best score per user, sorted desc */
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query('sessions').collect()
    const userMap = new Map<
      string,
      {
        attempts: number
        conversions: number
        bestScore: number
        bestOutcome: string
        totalScore: number
        bestDurationMs: number
      }
    >()

    for (const s of sessions) {
      const score = s.score?.overall ?? 0
      const existing = userMap.get(s.userName)
      if (existing) {
        existing.attempts++
        if (s.outcome === 'converted') existing.conversions++
        existing.totalScore += score
        if (score > existing.bestScore) {
          existing.bestScore = score
          existing.bestOutcome = s.outcome
          existing.bestDurationMs = s.durationMs
        }
      } else {
        userMap.set(s.userName, {
          attempts: 1,
          conversions: s.outcome === 'converted' ? 1 : 0,
          bestScore: score,
          bestOutcome: s.outcome,
          totalScore: score,
          bestDurationMs: s.durationMs,
        })
      }
    }

    return Array.from(userMap.entries())
      .map(([name, data]) => ({
        userName: name,
        ...data,
        avgScore: Math.round(data.totalScore / data.attempts),
      }))
      .sort((a, b) => b.bestScore - a.bestScore)
  },
})
