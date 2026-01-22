import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  uploads: defineTable({
    month: v.string(),
    fileName: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
})
