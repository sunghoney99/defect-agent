import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  uploads: defineTable({
    month: v.string(),
    fileName: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  comments: defineTable({
    monthKey: v.string(),
    name: v.string(),
    team: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_monthKey", ["monthKey"]),

  analysisData: defineTable({
    data: v.string(),
    updatedAt: v.number(),
  }),

  monthlyAnalysis: defineTable({
    monthKey: v.string(),
    records: v.string(),
    monthlyStat: v.string(),
    productCauseStats: v.string(),
    monthlyTotal: v.string(),
    categories: v.string(),
    updatedAt: v.number(),
  }).index("by_monthKey", ["monthKey"]),
})
