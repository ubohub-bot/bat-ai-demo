import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  sessions: defineTable({
    userName: v.string(),
    personaId: v.string(),
    personaName: v.string(),
    outcome: v.string(), // 'converted' | 'rejected' | 'walked_away'
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
    endTrigger: v.optional(v.string()), // 'supervisor' | 'end_conversation' | 'disconnect'
    durationMs: v.number(),
    exchangeCount: v.number(),
  })
    .index('by_user', ['userName'])
    .index('by_outcome', ['outcome']),
})
