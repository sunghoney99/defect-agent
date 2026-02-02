"use client"

import { useAnalysis } from "@/context/analysis-context"
import { ExecutiveSummary } from "./executive-summary"
import { Dashboard } from "./dashboard"
import { ReportView } from "./report-view"
import { Loader2, AlertCircle, Upload } from "lucide-react"

export function AnalysisResults() {
    const { summary, currentAnalysis, isAnalyzing, error } = useAnalysis()

    if (isAnalyzing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="relative">
                    <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full" />
                    <Loader2 className="relative w-12 h-12 text-accent animate-spin mb-4" />
                </div>
                <p className="text-slate-800 font-black tracking-widest uppercase text-xs animate-pulse">AI 분석 엔진 가동 중...</p>
                <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-widest">Processing Unstructured Text</p>
            </div>
        )
    }

    // Show error message if there's an error
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-[3rem] border border-red-100 shadow-xl shadow-slate-200/50 p-8">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-slate-800 font-black text-lg mb-2">데이터를 불러올 수 없습니다</p>
                <p className="text-sm text-slate-500 text-center max-w-md mb-6">{error}</p>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
                    <Upload className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-slate-600">좌측 상단에서 엑셀 파일을 업로드하세요</span>
                </div>
            </div>
        )
    }

    // If no new analysis is selected, we can still show history or nothing.
    // The user said: "첫 페이지에서 신규 파일을 넣지 않은 상태에서는 아무것도 안뜨게 해줘"
    // But they also want charts for monthly stats.
    // Actually, once they analyze, they see results.
    // If they want to see history chart without new file?
    // For now, let's keep it so results appear after at least one upload.
    if (!summary || !currentAnalysis) {
        return null
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <ExecutiveSummary />
            <Dashboard />
            <ReportView />
        </div>
    )
}
