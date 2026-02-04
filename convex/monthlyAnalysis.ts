import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("monthlyAnalysis")
      .collect()
  },
})

export const getByMonth = query({
  args: { monthKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("monthlyAnalysis")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", args.monthKey))
      .first()
  },
})

export const save = mutation({
  args: {
    monthKey: v.string(),
    records: v.string(),
    monthlyStat: v.string(),
    productCauseStats: v.string(),
    monthlyTotal: v.string(),
    categories: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("monthlyAnalysis")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", args.monthKey))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        records: args.records,
        monthlyStat: args.monthlyStat,
        productCauseStats: args.productCauseStats,
        monthlyTotal: args.monthlyTotal,
        categories: args.categories,
        updatedAt: Date.now(),
      })
      return existing._id
    }

    return await ctx.db.insert("monthlyAnalysis", {
      monthKey: args.monthKey,
      records: args.records,
      monthlyStat: args.monthlyStat,
      productCauseStats: args.productCauseStats,
      monthlyTotal: args.monthlyTotal,
      categories: args.categories,
      updatedAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: { monthKey: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("monthlyAnalysis")
      .withIndex("by_monthKey", (q) => q.eq("monthKey", args.monthKey))
      .first()
    if (existing) {
      await ctx.db.delete(existing._id)
    }
    return { success: true }
  },
})
