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
          relationship: v.number(),
          needsDiscovery: v.number(),
          productPresentation: v.number(),
          compliance: v.number(),
        }),
        complianceDetails: v.object({
          ageVerification: v.string(),
          smokerCheck: v.string(),
          forbiddenWords: v.array(v.string()),
        }),
        highlights: v.array(v.string()),
        improvements: v.array(v.string()),
        fails: v.array(v.string()),
        summary: v.optional(v.string()),
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

