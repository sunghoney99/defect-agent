"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef
} from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { AnalysisSummary, MonthlyStat, ProductCauseMonthlyStat, MonthlyTotal, DefectRecord } from "@/lib/types"
import { analyzeFile, buildExecutiveReport } from "@/lib/analysis-engine"

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
      const result = await analyzeFile(file)
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
  }, [createUpload, saveMonthlyAnalysis])

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
