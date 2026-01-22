"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react"
import { AnalysisSummary } from "@/lib/types"
import { analyzeFile, buildExecutiveReport } from "@/lib/analysis-engine"

type UploadRecord = {
  id: number
  month: string
  fileName: string
  createdAt: string
}

type AnalysisContextValue = {
  summary: AnalysisSummary | null
  currentAnalysis: AnalysisSummary | null
  uploads: UploadRecord[]
  isAnalyzing: boolean
  error: string | null
  analyze: (file: File) => Promise<void>
  setCurrentMonth: (monthKey: string) => void
  deleteUpload: (id: number) => Promise<void>
  fetchUploads: () => Promise<void>
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
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUploads = useCallback(async () => {
    try {
      const res = await fetch('/api/uploads', { cache: 'no-store' })
      if (!res.ok) {
        const text = await res.text()
        console.error("Server Error:", text)
        return
      }
      const data = await res.json()
      if (Array.isArray(data)) {
        setUploads(data)
      }
    } catch (e) {
      console.error("Failed to fetch uploads:", e)
    }
  }, [])

  useEffect(() => {
    const initial = loadFromStorage()
    if (initial) setSummary(initial)
    void fetchUploads()
  }, [fetchUploads])

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

      // Post to DB
      const resultMonth = result.monthlyStats.length > 0
        ? result.monthlyStats[result.monthlyStats.length - 1].monthKey
        : "Unknown"

      console.log("Saving upload to DB:", { month: resultMonth, fileName: file.name })
      const postRes = await fetch('/api/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: resultMonth,
          fileName: file.name
        })
      })

      if (!postRes.ok) {
        let errorMsg = "DB 저장에 실패했습니다."
        try {
          const errorData = await postRes.json()
          errorMsg = errorData.error || errorMsg
        } catch {
          const text = await postRes.text()
          console.error("Server raw error:", text)
        }
        console.error("Failed to post upload:", errorMsg)
        throw new Error(errorMsg)
      }

      // Refresh list
      await fetchUploads()
    } catch (e: any) {
      console.error("Analysis Error:", e)
      setError(e.message || "엑셀 파일을 분석하는 중 오류가 발생했습니다.")
    } finally {
      setIsAnalyzing(false)
    }
  }, [fetchUploads])

  const setCurrentMonth = useCallback((monthKey: string) => {
    if (!summary) return

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
    if (relevantStatsIdx === -1) return

    setCurrentAnalysis({
      ...summary,
      monthlyStats: summary.monthlyStats.slice(0, relevantStatsIdx + 1),
      executiveReport: finalReport
    })
  }, [summary])

  const deleteUpload = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/uploads?id=${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setUploads(prev => prev.filter(u => u.id !== id))
      }
    } catch (e) {
      console.error("Failed to delete upload:", e)
    }
  }, [])

  const reset = useCallback(() => {
    setSummary(null)
    setCurrentAnalysis(null)
    setError(null)
    saveToStorage(null)
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

