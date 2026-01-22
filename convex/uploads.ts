import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    const uploads = await ctx.db
      .query("uploads")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()
    return uploads
  },
})

export const create = mutation({
  args: {
    month: v.string(),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const uploadId = await ctx.db.insert("uploads", {
      month: args.month,
      fileName: args.fileName,
      createdAt: Date.now(),
    })
    return uploadId
  },
})

export const remove = mutation({
  args: {
    id: v.id("uploads"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})
