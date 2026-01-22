"use client"

import { useRef, useState } from "react"
import { useAnalysis } from "@/context/analysis-context"
import {
    Upload,
    FileSpreadsheet,
    Loader2,
    Plus,
    AlertCircle,
    X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function NewAnalysisZone() {
    const { analyze, isAnalyzing, error, currentAnalysis, clearAnalysis } = useAnalysis()
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && file.name.endsWith(".xlsx")) {
            await analyze(file)
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            await analyze(file)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Upload className="w-4 h-4 text-accent" />
                    신규 파일 분석
                </h2>
                {currentAnalysis && (
                    <button
                        onClick={clearAnalysis}
                        className="text-[10px] font-bold text-slate-400 hover:text-accent flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        분석 결과 닫기
                    </button>
                )}
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          relative group cursor-pointer
          border-2 border-dashed rounded-[2.5rem] p-10
          transition-all duration-500 shadow-xl shadow-slate-200/20
          ${isDragging
                        ? "border-accent bg-blue-50/50 scale-[0.98] shadow-[0_0_40px_-10px_rgba(37,99,235,0.2)]"
                        : "border-slate-200 bg-white hover:border-accent/40 hover:bg-slate-50/50"
                    }
        `}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx"
                    className="hidden"
                />

                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-accent/10 blur-2xl rounded-full group-hover:bg-accent/20 transition-colors duration-500" />
                        <div className={`
              relative w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center
              group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg shadow-slate-200/50
            `}>
                            {isAnalyzing ? (
                                <Loader2 className="w-8 h-8 text-accent animate-spin" />
                            ) : (
                                <FileSpreadsheet className="w-8 h-8 text-accent group-hover:text-blue-600 transition-colors" />
                            )}
                        </div>
                        {!isAnalyzing && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full border-4 border-white flex items-center justify-center shadow-lg shadow-accent/20">
                                <Plus className="w-3 h-3 text-white stroke-[4px]" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-black text-slate-800">
                            {isAnalyzing ? "AI 분석 엔진 가동 중..." : "분석할 엑셀 파일을 선택하거나 끌어다 놓으세요"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            .xlsx format only • auto cause classification
                        </p>
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <p className="text-xs font-bold leading-tight">{error}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            {/* Template Guide Section */}
            <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-5">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">엑셀 파일 제작 가이드</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Excel Preparation Guide</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const link = document.createElement('a');
                            link.href = '/template.xlsx';
                            link.download = '하자분석_시스템_표준양식.xlsx';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-emerald-500 hover:text-emerald-600 transition-all text-[11px] font-black text-slate-600 group"
                    >
                        <Upload className="w-3.5 h-3.5 rotate-180 group-hover:-translate-y-0.5 transition-transform" />
                        표준 양식 다운로드
                    </button>
                </div>

                <div className="space-y-4 px-1">
                    <div className="space-y-3">
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed italic">
                            * 아래 가이드에서 <span className="text-emerald-600 font-black">x</span>는 파일이 해당되는 월(숫자)을 의미합니다. (예: 12월 데이터라면 x=12)
                        </p>

                        <div className="grid gap-4">
                            <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-slate-800">
                                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">1</div>
                                    <p className="text-xs font-black">시트 및 요약 데이터 구성</p>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-relaxed pl-7">
                                    <strong className="text-slate-900">&apos;x월 하자보수비 금액&apos;</strong> 시트 내에 해당 월의 브랜드별 하자보수비 통계를 입력합니다.
                                    반드시 <span className="bg-slate-100 px-1 rounded font-bold">&apos;구분 / R&D / 고객불만 / 사양재검토 / 세트교환요구 / 영업지원(BS) / 전체 / 담당자&apos;</span> 순서로 데이터가 구성되어야 합니다.
                                </p>
                            </div>

                            <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                                <div className="flex items-center gap-2 text-slate-800">
                                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">2</div>
                                    <p className="text-xs font-black">분석 대상 데이터 선별 및 정리</p>
                                </div>
                                <div className="text-[11px] text-slate-600 leading-relaxed pl-7 space-y-2">
                                    <p>
                                        판정형태가 <span className="text-emerald-600 font-bold">&apos;세트교환요구&apos;</span> 또는 <span className="text-blue-600 font-bold">&apos;고객불만&apos;</span>인 건을 우선으로 추려냅니다.
                                    </p>
                                    <p>
                                        데이터는 <strong className="text-slate-900 text-accent">하나의 접수번호당 하나의 행(Row)</strong>만 존재하도록 중복을 정리해주시고, 1행의 항목 구분과 맞지 않는 불필요한 열은 숨기기 또는 삭제 처리해 주시기 바랍니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start gap-3">
                        <div className="text-amber-500 font-bold mt-0.5">💡</div>
                        <p className="text-[11px] text-amber-700/90 leading-relaxed font-medium">
                            정리가 어려우신 경우 우측 상단의 <strong>[표준 양식 다운로드]</strong>를 통해 제공되는 샘플 시트의 구조를 그대로 복격하여 사용하시면 가장 정확한 분석 결과를 얻으실 수 있습니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

import * as XLSX from "xlsx"
