import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const get = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("analysisData").collect()
    if (docs.length === 0) return null
    return docs[0]
  },
})

export const save = mutation({
  args: {
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("analysisData").collect()
    if (existing.length > 0) {
      await ctx.db.patch(existing[0]._id, {
        data: args.data,
        updatedAt: Date.now(),
      })
      return existing[0]._id
    }
    const id = await ctx.db.insert("analysisData", {
      data: args.data,
      updatedAt: Date.now(),
    })
    return id
  },
})

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("analysisData").collect()
    for (const doc of existing) {
      await ctx.db.delete(doc._id)
    }
    return { success: true }
  },
})
