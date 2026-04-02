"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { AnalysisSummary, MonthlyStat, ProductCauseMonthlyStat, MonthlyTotal, DefectRecord } from "@/lib/types"
import { analyzeFile, buildExecutiveReport, buildMonthlyStats, buildProductCauseMonthlyStats, retagAllRecords, CAUSE_KEYWORDS } from "@/lib/analysis-engine"

const CUSTOM_KEYWORDS_KEY = "defect-agent-custom-keywords"
const USER_KEYWORD_RULES_KEY = "defect-agent-user-keyword-rules"
const DELETED_KEYWORDS_KEY = "defect-agent-deleted-keywords"

function loadUserKeywordRules(): Record<string, string[]> {
  if (typeof window === "undefined") return {}
  try {
    const stored = window.localStorage.getItem(USER_KEYWORD_RULES_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch { return {} }
}

function saveUserKeywordRules(rules: Record<string, string[]>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(USER_KEYWORD_RULES_KEY, JSON.stringify(rules))
  } catch {}
}

function loadDeletedKeywords(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = window.localStorage.getItem(DELETED_KEYWORDS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveDeletedKeywords(keywords: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DELETED_KEYWORDS_KEY, JSON.stringify(keywords))
  } catch {}
}

// Keyword rename migrations: old → new
const CAUSE_MIGRATIONS: Record<string, string> = {
  "고주파음 불만": "스위치 소음",
  "목제 얼룩": "목제 오염",
}

function migrateRecordCauses(records: DefectRecord[]): { records: DefectRecord[]; changed: boolean } {
  let changed = false
  const migrated = records.map(r => {
    const newCause = CAUSE_MIGRATIONS[r.normalizedCause]
    if (newCause) {
      changed = true
      return { ...r, normalizedCause: newCause }
    }
    return r
  })
  return { records: migrated, changed }
}

function loadCustomKeywords(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = window.localStorage.getItem(CUSTOM_KEYWORDS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveCustomKeywords(keywords: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(CUSTOM_KEYWORDS_KEY, JSON.stringify(keywords))
  } catch {}
}

type UploadRecord = {
  _id: Id<"uploads">
  month: string
  fileName: string
  createdAt: number
}

type AnalysisContextValue = {
  summary: AnalysisSummary | null
  currentAnalysis: AnalysisSummary | null
  uploads: UploadRecord[]
  isAnalyzing: boolean
  error: string | null
  analyze: (file: File) => Promise<void>
  setCurrentMonth: (monthKey: string) => void
  deleteUpload: (id: Id<"uploads">) => Promise<void>
  fetchUploads: () => void
  updateRecordCause: (recordId: string, newCause: string) => void
  deleteKeyword: (keyword: string) => void
  causeOptions: string[]
  addCustomKeyword: (keyword: string) => void
  reset: () => void
  clearAnalysis: () => void
}

const AnalysisContext = createContext<AnalysisContextValue | undefined>(
  undefined
)

const STORAGE_KEY = "defect-agent-analysis"

function loadFromStorage(): AnalysisSummary | null {
  if (typeof window === "undefined") return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as AnalysisSummary
  } catch {
    return null
  }
}

function saveToStorage(summary: AnalysisSummary | null) {
  if (typeof window === "undefined") return
  try {
    if (!summary) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(summary))
  } catch {
  }
}

export function AnalysisProvider(props: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<AnalysisSummary | null>(null)
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisSummary | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customKeywords, setCustomKeywords] = useState<string[]>(() => loadCustomKeywords())
  const [userKeywordRules, setUserKeywordRules] = useState<Record<string, string[]>>(() => loadUserKeywordRules())
  const [deletedKeywords, setDeletedKeywords] = useState<string[]>(() => loadDeletedKeywords())

  // Build unified cause options: base keywords + custom + "기타"
  const causeOptions = useMemo(() => {
    const base = Object.keys(CAUSE_KEYWORDS)
    const ruleKeys = Object.keys(userKeywordRules)
    const all = new Set([...base, ...ruleKeys, ...customKeywords])
    deletedKeywords.forEach(k => all.delete(k))
    all.add("기타")
    return Array.from(all)
  }, [customKeywords, userKeywordRules, deletedKeywords])

  const addCustomKeyword = useCallback((keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return
    setCustomKeywords(prev => {
      if (prev.includes(trimmed) || Object.keys(CAUSE_KEYWORDS).includes(trimmed) || trimmed === "기타") return prev
      const updated = [...prev, trimmed]
      saveCustomKeywords(updated)
      return updated
    })
  }, [])
  const loadedFromConvex = useRef(false)
  const syncedToConvex = useRef(false)

  // Convex queries and mutations
  const uploadsData = useQuery(api.uploads.list)
  const createUpload = useMutation(api.uploads.create)
  const removeUpload = useMutation(api.uploads.remove)
  const monthlyAnalysisList = useQuery(api.monthlyAnalysis.list)
  const saveMonthlyAnalysis = useMutation(api.monthlyAnalysis.save)
  const removeMonthlyAnalysis = useMutation(api.monthlyAnalysis.remove)

  const uploads = uploadsData ?? []

  // Reconstruct summary from Convex monthly analysis data
  useEffect(() => {
    if (loadedFromConvex.current) return
    if (monthlyAnalysisList === undefined) return // still loading

    if (monthlyAnalysisList && monthlyAnalysisList.length > 0) {
      try {
        let allRecords: DefectRecord[] = []
        let allMonthlyStats: MonthlyStat[] = []
        let allProductCauseStats: ProductCauseMonthlyStat[] = []
        let allMonthlyTotals: MonthlyTotal[] = []
        let allCategories: Set<string> = new Set()

        for (const doc of monthlyAnalysisList) {
          const records = JSON.parse(doc.records) as DefectRecord[]
          const monthlyStat = JSON.parse(doc.monthlyStat) as MonthlyStat
          const productCauseStats = JSON.parse(doc.productCauseStats) as ProductCauseMonthlyStat[]
          const monthlyTotal = JSON.parse(doc.monthlyTotal) as MonthlyTotal
          const categories = JSON.parse(doc.categories) as string[]

          allRecords.push(...records)
          allMonthlyStats.push(monthlyStat)
          allProductCauseStats.push(...productCauseStats)
          allMonthlyTotals.push(monthlyTotal)
          categories.forEach(c => allCategories.add(c))
        }

        // Apply keyword migrations to loaded records
        const { records: migratedRecords, changed: migrationApplied } = migrateRecordCauses(allRecords)
        allRecords = migratedRecords

        // If migration was applied, recompute stats from migrated records
        if (migrationApplied) {
          allMonthlyStats = buildMonthlyStats(allRecords)
          allProductCauseStats = buildProductCauseMonthlyStats(allRecords)
          allCategories = new Set(allRecords.map(r => r.normalizedCause))
        }

        allMonthlyStats.sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        allMonthlyTotals.sort((a, b) => a.monthKey.localeCompare(b.monthKey))
        allProductCauseStats.sort((a, b) => a.monthKey.localeCompare(b.monthKey))

        const latestMonth = allMonthlyStats[allMonthlyStats.length - 1]?.monthKey
        const executiveReport = buildExecutiveReport(allProductCauseStats, allMonthlyTotals, allRecords, latestMonth)

        const reconstructed: AnalysisSummary = {
          records: allRecords,
          monthlyStats: allMonthlyStats,
          categories: Array.from(allCategories),
          productCauseMonthlyStats: allProductCauseStats,
          monthlyTotals: allMonthlyTotals,
          executiveReport
        }

        setSummary(reconstructed)
        setCurrentAnalysis(reconstructed)
        saveToStorage(reconstructed)
        loadedFromConvex.current = true

        // Persist migrated data back to Convex
        if (migrationApplied) {
          syncLocalStorageToConvex(reconstructed)
        }

        return
      } catch (e) {
        console.error("Failed to load from Convex:", e)
      }
    }

    // Fallback: load from localStorage and sync to Convex
    const initial = loadFromStorage()
    if (initial) {
      setSummary(initial)
      // Sync localStorage data to Convex per month
      if (!syncedToConvex.current) {
        syncedToConvex.current = true
        syncLocalStorageToConvex(initial)
      }
    }
    loadedFromConvex.current = true
  }, [monthlyAnalysisList])

  // Sync localStorage data to Convex (one-time migration)
  const syncLocalStorageToConvex = useCallback(async (data: AnalysisSummary) => {
    try {
      for (const stat of data.monthlyStats) {
        const monthRecords = data.records.filter(r => r.monthKey === stat.monthKey)
        const monthProductCauseStats = data.productCauseMonthlyStats.filter(s => s.monthKey === stat.monthKey)
        const monthTotal = data.monthlyTotals.find(t => t.monthKey === stat.monthKey)
        if (!monthTotal) continue

        await saveMonthlyAnalysis({
          monthKey: stat.monthKey,
          records: JSON.stringify(monthRecords),
          monthlyStat: JSON.stringify(stat),
          productCauseStats: JSON.stringify(monthProductCauseStats),
          monthlyTotal: JSON.stringify(monthTotal),
          categories: JSON.stringify(data.categories),
        })
      }
      console.log("Synced localStorage data to Convex successfully")
    } catch (e) {
      console.error("Failed to sync to Convex:", e)
    }
  }, [saveMonthlyAnalysis])

  const fetchUploads = useCallback(() => {
    // Convex auto-refreshes, this is just for API compatibility
  }, [])

  const analyze = useCallback(async (file: File) => {
    setIsAnalyzing(true)
    setError(null)
    try {
      const result = await analyzeFile(file, userKeywordRules, deletedKeywords)
      const targetMonthKey = result.monthlyStats[result.monthlyStats.length - 1]?.monthKey

      // Merge with existing summary if it exists
      setSummary(prev => {
        if (!prev) {
          setCurrentAnalysis(result)
          saveToStorage(result)
          return result
        }

        const newMonthKeys = result.monthlyStats.map(s => s.monthKey)
        const combinedRecords = [
          ...prev.records.filter(r => !newMonthKeys.includes(r.monthKey)),
          ...result.records
        ]

        const mergedMonthlyTotals = [...prev.monthlyTotals]
        result.monthlyTotals.forEach(newTotal => {
          const idx = mergedMonthlyTotals.findIndex(t => t.monthKey === newTotal.monthKey)
          if (idx !== -1) mergedMonthlyTotals[idx] = newTotal
          else mergedMonthlyTotals.push(newTotal)
        })
        mergedMonthlyTotals.sort((a, b) => a.monthKey.localeCompare(b.monthKey))

        const mergedMonthlyStats = [...prev.monthlyStats]
        result.monthlyStats.forEach(newStat => {
          const idx = mergedMonthlyStats.findIndex(s => s.monthKey === newStat.monthKey)
          if (idx !== -1) mergedMonthlyStats[idx] = newStat
          else mergedMonthlyStats.push(newStat)
        })
        mergedMonthlyStats.sort((a, b) => a.monthKey.localeCompare(b.monthKey))

        const mergedProductCauseStats = [...prev.productCauseMonthlyStats]
        result.productCauseMonthlyStats.forEach(newStat => {
          const idx = mergedProductCauseStats.findIndex(s =>
            s.monthKey === newStat.monthKey &&
            s.product === newStat.product &&
            s.normalizedCause === newStat.normalizedCause
          )
          if (idx !== -1) mergedProductCauseStats[idx] = newStat
          else mergedProductCauseStats.push(newStat)
        })
        mergedProductCauseStats.sort((a, b) => a.monthKey.localeCompare(b.monthKey))

        // Re-generate the executive report using the full merged history
        const finalReport = buildExecutiveReport(mergedProductCauseStats, mergedMonthlyTotals, combinedRecords, targetMonthKey)

        const finalSummary = {
          ...result,
          records: combinedRecords,
          monthlyTotals: mergedMonthlyTotals,
          monthlyStats: mergedMonthlyStats,
          productCauseMonthlyStats: mergedProductCauseStats,
          executiveReport: finalReport
        }

        // Also update currentAnalysis with the report that has comparison info
        setCurrentAnalysis({
          ...result,
          executiveReport: finalReport
        })

        saveToStorage(finalSummary)
        return finalSummary
      })

      // Post to Convex DB
      const resultMonth = result.monthlyStats.length > 0
        ? result.monthlyStats[result.monthlyStats.length - 1].monthKey
        : "Unknown"

      console.log("Saving upload to Convex:", { month: resultMonth, fileName: file.name })
      await createUpload({
        month: resultMonth,
        fileName: file.name
      })

      // Save each month's analysis data to Convex
      for (const stat of result.monthlyStats) {
        const monthRecords = result.records.filter(r => r.monthKey === stat.monthKey)
        const monthProductCauseStats = result.productCauseMonthlyStats.filter(s => s.monthKey === stat.monthKey)
        const monthTotal = result.monthlyTotals.find(t => t.monthKey === stat.monthKey)
        if (!monthTotal) continue

        await saveMonthlyAnalysis({
          monthKey: stat.monthKey,
          records: JSON.stringify(monthRecords),
          monthlyStat: JSON.stringify(stat),
          productCauseStats: JSON.stringify(monthProductCauseStats),
          monthlyTotal: JSON.stringify(monthTotal),
          categories: JSON.stringify(result.categories),
        })
      }

    } catch (e: any) {
      console.error("Analysis Error:", e)
      setError(e.message || "엑셀 파일을 분석하는 중 오류가 발생했습니다.")
    } finally {
      setIsAnalyzing(false)
    }
  }, [createUpload, saveMonthlyAnalysis, userKeywordRules, deletedKeywords])

  const setCurrentMonth = useCallback((monthKey: string) => {
    if (!summary) {
      setError("분석 데이터가 없습니다. 해당 월의 엑셀 파일을 다시 업로드해주세요.")
      return
    }

    // Re-generate the executive report for the selected month using historical data
    const finalReport = buildExecutiveReport(
      summary.productCauseMonthlyStats,
      summary.monthlyTotals,
      summary.records,
      monthKey
    )

    // Filter monthlyStats and records for the UI to focus on this month
    // Most UI components already slice based on the last entry, so we ensure
    // the monthlyStats ends with the selected month
    const relevantStatsIdx = summary.monthlyStats.findIndex(s => s.monthKey === monthKey)
    if (relevantStatsIdx === -1) {
      setError("해당 월의 분석 데이터를 찾을 수 없습니다. 엑셀 파일을 다시 업로드해주세요.")
      return
    }

    setError(null)
    setCurrentAnalysis({
      ...summary,
      monthlyStats: summary.monthlyStats.slice(0, relevantStatsIdx + 1),
      executiveReport: finalReport
    })
  }, [summary])

  const deleteUpload = useCallback(async (id: Id<"uploads">) => {
    try {
      // Find the upload to get its month before deleting
      const upload = uploads.find(u => u._id === id)
      await removeUpload({ id })
      // Also remove the monthly analysis data
      if (upload) {
        await removeMonthlyAnalysis({ monthKey: upload.month })
      }
    } catch (e) {
      console.error("Failed to delete upload:", e)
    }
  }, [removeUpload, removeMonthlyAnalysis, uploads])

  const updateRecordCause = useCallback((recordId: string, newCause: string) => {
    if (!summary) return

    const record = summary.records.find(r => r.id === recordId)
    if (!record || record.normalizedCause === newCause) return

    const text = `${record.rawCauseFields.requestText} ${record.rawCauseFields.actionText}`

    // 1. Derive updated custom keyword rules from this user correction
    const updatedRules = { ...userKeywordRules }
    const existingCustom = updatedRules[newCause] || []

    // Find patterns from the new cause's default keywords that match this text
    const defaultNewPatterns = CAUSE_KEYWORDS[newCause] || []
    const matchingNew = defaultNewPatterns.filter(p => text.includes(p))

    if (matchingNew.length > 0) {
      // Existing patterns match → add to custom rules for higher priority
      updatedRules[newCause] = Array.from(new Set([...existingCustom, ...matchingNew]))
    } else {
      // No existing patterns match → extract new patterns from record text
      const allPatterns = new Set([
        ...Object.values(CAUSE_KEYWORDS).flat(),
        ...Object.values(updatedRules).flat()
      ])
      const words = text.split(/[\s,.\-()[\]{}]+/).filter(w => w.length >= 2 && !allPatterns.has(w))
      if (words.length > 0) {
        updatedRules[newCause] = Array.from(new Set([...existingCustom, ...words.slice(0, 5)]))
      }
    }

    setUserKeywordRules(updatedRules)
    saveUserKeywordRules(updatedRules)

    // 2. Re-tag ALL records with updated rules
    let updatedRecords = retagAllRecords(summary.records, updatedRules, deletedKeywords)

    // Ensure the specific record always gets the user's chosen tag
    updatedRecords = updatedRecords.map(r =>
      r.id === recordId ? { ...r, normalizedCause: newCause } : r
    )

    // 3. Recompute all statistics from updated records
    const newMonthlyStats = buildMonthlyStats(updatedRecords)
    const newProductCauseStats = buildProductCauseMonthlyStats(updatedRecords)
    const newCategories = Array.from(new Set(updatedRecords.map(r => r.normalizedCause)))

    const latestMonthKey = currentAnalysis?.monthlyStats?.[currentAnalysis.monthlyStats.length - 1]?.monthKey
    const newExecutiveReport = buildExecutiveReport(
      newProductCauseStats,
      summary.monthlyTotals,
      updatedRecords,
      latestMonthKey
    )

    // 4. Build updated summary
    const updatedSummary: AnalysisSummary = {
      ...summary,
      records: updatedRecords,
      monthlyStats: newMonthlyStats,
      productCauseMonthlyStats: newProductCauseStats,
      categories: newCategories,
      executiveReport: newExecutiveReport
    }

    setSummary(updatedSummary)
    setCurrentAnalysis({
      ...updatedSummary,
      monthlyStats: latestMonthKey
        ? newMonthlyStats.slice(0, newMonthlyStats.findIndex(s => s.monthKey === latestMonthKey) + 1)
        : newMonthlyStats,
      executiveReport: newExecutiveReport
    })
    saveToStorage(updatedSummary)

    // 5. Save all affected months to Convex
    const changedMonthsSet = new Set<string>()
    updatedRecords.forEach((r, i) => {
      if (r.normalizedCause !== summary.records[i]?.normalizedCause) {
        changedMonthsSet.add(r.monthKey)
      }
    })

    for (const monthKey of Array.from(changedMonthsSet)) {
      const monthRecords = updatedRecords.filter(r => r.monthKey === monthKey)
      const monthStat = newMonthlyStats.find(s => s.monthKey === monthKey)
      const monthProductCauseStats = newProductCauseStats.filter(s => s.monthKey === monthKey)
      const monthTotal = summary.monthlyTotals.find(t => t.monthKey === monthKey)
      if (monthStat && monthTotal) {
        saveMonthlyAnalysis({
          monthKey,
          records: JSON.stringify(monthRecords),
          monthlyStat: JSON.stringify(monthStat),
          productCauseStats: JSON.stringify(monthProductCauseStats),
          monthlyTotal: JSON.stringify(monthTotal),
          categories: JSON.stringify(newCategories),
        }).catch(e => console.error("Failed to save to Convex:", e))
      }
    }
  }, [summary, currentAnalysis, userKeywordRules, deletedKeywords, saveMonthlyAnalysis])

  const deleteKeyword = useCallback((keyword: string) => {
    if (!summary || keyword === "기타") return

    // 1. Add to deleted keywords list
    const updatedDeleted = [...deletedKeywords, keyword]
    setDeletedKeywords(updatedDeleted)
    saveDeletedKeywords(updatedDeleted)

    // Remove from custom keywords if present
    setCustomKeywords(prev => {
      const updated = prev.filter(k => k !== keyword)
      saveCustomKeywords(updated)
      return updated
    })

    // Remove from user keyword rules if present
    const updatedRules = { ...userKeywordRules }
    delete updatedRules[keyword]
    setUserKeywordRules(updatedRules)
    saveUserKeywordRules(updatedRules)

    // 2. Re-tag all records: deleted keyword records will fall through to other matches or "기타"
    const updatedRecords = retagAllRecords(summary.records, updatedRules, updatedDeleted)

    // 3. Recompute all statistics
    const newMonthlyStats = buildMonthlyStats(updatedRecords)
    const newProductCauseStats = buildProductCauseMonthlyStats(updatedRecords)
    const newCategories = Array.from(new Set(updatedRecords.map(r => r.normalizedCause)))

    const latestMonthKey = currentAnalysis?.monthlyStats?.[currentAnalysis.monthlyStats.length - 1]?.monthKey
    const newExecutiveReport = buildExecutiveReport(
      newProductCauseStats,
      summary.monthlyTotals,
      updatedRecords,
      latestMonthKey
    )

    const updatedSummary: AnalysisSummary = {
      ...summary,
      records: updatedRecords,
      monthlyStats: newMonthlyStats,
      productCauseMonthlyStats: newProductCauseStats,
      categories: newCategories,
      executiveReport: newExecutiveReport
    }

    setSummary(updatedSummary)
    setCurrentAnalysis({
      ...updatedSummary,
      monthlyStats: latestMonthKey
        ? newMonthlyStats.slice(0, newMonthlyStats.findIndex(s => s.monthKey === latestMonthKey) + 1)
        : newMonthlyStats,
      executiveReport: newExecutiveReport
    })
    saveToStorage(updatedSummary)

    // 4. Save all affected months to Convex
    const changedMonthsSet = new Set<string>()
    updatedRecords.forEach((r, i) => {
      if (r.normalizedCause !== summary.records[i]?.normalizedCause) {
        changedMonthsSet.add(r.monthKey)
      }
    })

    for (const monthKey of Array.from(changedMonthsSet)) {
      const monthRecords = updatedRecords.filter(r => r.monthKey === monthKey)
      const monthStat = newMonthlyStats.find(s => s.monthKey === monthKey)
      const monthProductCauseStats = newProductCauseStats.filter(s => s.monthKey === monthKey)
      const monthTotal = summary.monthlyTotals.find(t => t.monthKey === monthKey)
      if (monthStat && monthTotal) {
        saveMonthlyAnalysis({
          monthKey,
          records: JSON.stringify(monthRecords),
          monthlyStat: JSON.stringify(monthStat),
          productCauseStats: JSON.stringify(monthProductCauseStats),
          monthlyTotal: JSON.stringify(monthTotal),
          categories: JSON.stringify(newCategories),
        }).catch(e => console.error("Failed to save to Convex:", e))
      }
    }
  }, [summary, currentAnalysis, deletedKeywords, userKeywordRules, saveMonthlyAnalysis])

  const reset = useCallback(() => {
    setSummary(null)
    setCurrentAnalysis(null)
    setError(null)
    saveToStorage(null)
    loadedFromConvex.current = false
    syncedToConvex.current = false
  }, [])

  const clearAnalysis = useCallback(() => {
    setCurrentAnalysis(null)
  }, [])

  const value: AnalysisContextValue = {
    summary,
    currentAnalysis,
    uploads,
    isAnalyzing,
    error,
    analyze,
    setCurrentMonth,
    updateRecordCause,
    deleteKeyword,
    causeOptions,
    addCustomKeyword,
    deleteUpload,
    fetchUploads,
    reset,
    clearAnalysis
  }

  return (
    <AnalysisContext.Provider value={value}>
      {props.children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error("useAnalysis는 AnalysisProvider 내부에서만 사용할 수 있습니다.")
  }
  return context
}
