import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const listByMonth = query({
  args: {
    monthKey: v.string(),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", args.monthKey))
      .order("desc")
      .collect()
    return comments
  },
})

export const create = mutation({
  args: {
    monthKey: v.string(),
    name: v.string(),
    team: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      monthKey: args.monthKey,
      name: args.name,
      team: args.team,
      content: args.content,
      createdAt: Date.now(),
    })
    return commentId
  },
})

export const remove = mutation({
  args: {
    id: v.id("comments"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
    return { success: true }
  },
})
