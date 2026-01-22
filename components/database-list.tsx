"use client"

import { useAnalysis } from "@/context/analysis-context"
import {
    Trash2,
    Database,
    Calendar,
    Layers,
    RotateCw,
    FileText,
    HardDrive,
    Download,
    GripVertical
} from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { useMemo, useCallback, useState, useEffect } from "react"
import * as XLSX from "xlsx"

const UPLOAD_ORDER_KEY = "defect-agent-upload-order"

export default function DatabaseList() {
    const { uploads, deleteUpload, fetchUploads, summary, setCurrentMonth, reset } = useAnalysis()
    const [orderedUploads, setOrderedUploads] = useState(uploads)

    // Sync orderedUploads when uploads change (new upload added or deleted)
    useEffect(() => {
        // Load saved order from localStorage
        const savedOrder = localStorage.getItem(UPLOAD_ORDER_KEY)
        if (savedOrder) {
            try {
                const orderIds: string[] = JSON.parse(savedOrder)
                // Sort uploads according to saved order, new uploads go to top
                const sorted = [...uploads].sort((a, b) => {
                    const aIdx = orderIds.indexOf(a._id)
                    const bIdx = orderIds.indexOf(b._id)
                    // If both are in saved order, use that order
                    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
                    // New items (not in saved order) go to top
                    if (aIdx === -1 && bIdx !== -1) return -1
                    if (aIdx !== -1 && bIdx === -1) return 1
                    // Both new, maintain original order
                    return 0
                })
                setOrderedUploads(sorted)
            } catch {
                setOrderedUploads(uploads)
            }
        } else {
            setOrderedUploads(uploads)
        }
    }, [uploads])

    // Save order to localStorage when reordered
    const handleReorder = useCallback((newOrder: typeof uploads) => {
        setOrderedUploads(newOrder)
        const orderIds = newOrder.map(u => u._id)
        localStorage.setItem(UPLOAD_ORDER_KEY, JSON.stringify(orderIds))
    }, [])

    const downloadExcel = useCallback((monthKey: string, fileName: string) => {
        if (!summary) return

        // 1. Filter records for that month
        const monthlyRecords = summary.records.filter(r => r.monthKey === monthKey)
        if (monthlyRecords.length === 0) {
            alert("해당 월의 상세 데이터가 없습니다.")
            return
        }

        // 2. Map data for Excel with specific columns requested by user
        const excelData = monthlyRecords.map((r, idx) => ({
            "No": idx + 1,
            "접수번호": r.extraFields?.orderNo || "",
            "부품명": r.extraFields?.partName || "",
            "제품코드": r.extraFields?.productCode || "",
            "판정형태": r.extraFields?.judgementForm || "",
            "판정구분": r.extraFields?.judgementClass || "",
            "조치결과특이사항": r.rawCauseFields.actionText,
            "요구내역": r.rawCauseFields.requestText,
            "품목": r.product,
            "하자사유": r.normalizedCause // AI 분석 키워드
        }))

        // 3. Create workbook and sheet
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(excelData)

        // Set column widths for readability
        const wscols = [
            { wch: 5 },  // No
            { wch: 15 }, // 접수번호
            { wch: 20 }, // 부품명
            { wch: 15 }, // 제품코드
            { wch: 20 }, // 판정형태
            { wch: 20 }, // 판정구분
            { wch: 50 }, // 조치결과특이사행
            { wch: 50 }, // 요구내역
            { wch: 20 }, // 품목
            { wch: 20 }  // 하자사유
        ]
        ws["!cols"] = wscols

        // sheet name should be like "x월"
        const sheetName = monthKey.split('-')[1].replace(/^0+/, '') + "월"
        XLSX.utils.book_append_sheet(wb, ws, sheetName)

        // 4. Trigger download
        const exportFileName = fileName.replace(/\.[^/.]+$/, "") + "_분석완료.xlsx"
        XLSX.writeFile(wb, exportFileName)
    }, [summary])

    const { recordCount, storageSize } = useMemo(() => {
        const count = summary?.records.length || 0
        const size = Math.round(JSON.stringify(summary || {}).length / 1024)
        return { recordCount: count, storageSize: size }
    }, [summary])

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Database className="w-4 h-4 text-accent" />
                    데이터 저장소 (월별 기록)
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">DB Online</span>
                    </div>
                    <button
                        onClick={() => fetchUploads()}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors group"
                        title="새로고침"
                    >
                        <RotateCw className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent group-active:rotate-180 transition-all duration-500" />
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                    {uploads.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                                <Layers className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-bold text-slate-400">저장된 데이터가 없습니다.</p>
                            <p className="text-[10px] text-slate-300 mt-1 uppercase font-bold tracking-widest">Storage Empty</p>
                        </div>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={orderedUploads}
                            onReorder={handleReorder}
                            className="divide-y divide-slate-100"
                        >
                            {orderedUploads.map((upload) => {
                                // Extract Year/Month from filename like "25년 12월" or "2025-12"
                                const fileName = upload.fileName;
                                const yearMatch = fileName.match(/(\d{2,4})년/);
                                const yearOnlyMatch = fileName.match(/(\d{4})/);
                                const monthMatch = fileName.match(/(\d{1,2})월/);
                                const monthDashMatch = fileName.match(/-(\d{2})/);

                                let displayYear = upload.month.split('-')[0];
                                let displayMonth = upload.month.split('-')[1] + "월";

                                if (yearMatch) displayYear = yearMatch[1] + "년";
                                else if (yearOnlyMatch) displayYear = yearOnlyMatch[1] + "년";

                                if (monthMatch) displayMonth = monthMatch[1] + "월";
                                else if (monthDashMatch) displayMonth = monthDashMatch[1] + "월";

                                return (
                                    <Reorder.Item
                                        key={upload._id}
                                        value={upload}
                                        className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-all cursor-grab active:cursor-grabbing border-l-4 border-transparent hover:border-accent active:bg-slate-100 bg-white"
                                        whileDrag={{
                                            scale: 1.02,
                                            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                            zIndex: 50
                                        }}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="p-1 rounded-lg hover:bg-slate-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
                                                title="드래그하여 순서 변경"
                                            >
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <div
                                                className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer"
                                                onClick={() => setCurrentMonth(upload.month)}
                                            >
                                                <div className="w-12 h-12 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center group-hover:border-accent/30 transition-colors">
                                                    <span className="text-[10px] font-black text-accent uppercase leading-tight">{displayMonth}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 tracking-tighter leading-tight">{displayYear}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-3 h-3 text-slate-400" />
                                                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-accent transition-colors">
                                                            {upload.fileName}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Calendar className="w-3 h-3 text-slate-300" />
                                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                                            업로드: {format(new Date(upload.createdAt), "yyyy.MM.dd HH:mm")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    downloadExcel(upload.month, upload.fileName)
                                                }}
                                                className="p-2 hover:bg-accent/10 rounded-xl transition-all hover:scale-110 active:scale-90"
                                                title="다운로드"
                                            >
                                                <Download className="w-4 h-4 text-slate-400 hover:text-accent transition-colors" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteUpload(upload._id)
                                                }}
                                                className="p-2 hover:bg-red-50 rounded-xl transition-all hover:scale-110 active:scale-90"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500 transition-colors" />
                                            </button>
                                        </div>
                                    </Reorder.Item>
                                );
                            })}
                        </Reorder.Group>
                    )}
                </div>
            </div>

            {/* Storage Status Footer */}
            <div className="p-5 bg-white border border-slate-200 rounded-[2rem] space-y-4 shadow-lg shadow-slate-200/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest">저장공간 상태</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Local Database Status</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">분석 파일 수</p>
                        <p className="text-lg font-black text-slate-800">{uploads.length}<span className="text-xs ml-1 text-slate-400">Files</span></p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 relative group/cache">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">브라우저 캐시 현황</p>
                        <div className="flex items-end justify-between">
                            <p className="text-lg font-black text-accent">{storageSize}<span className="text-xs ml-1 text-slate-400">KB</span></p>
                            <button
                                onClick={() => {
                                    if (confirm("모든 로컬 분석 캐시가 삭제됩니다. 계속하시겠습니까?\n(DB에 저장된 파일 목록은 유지됩니다)")) {
                                        reset();
                                    }
                                }}
                                className="px-2 py-1 rounded-md bg-red-50 text-red-500 text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover/cache:opacity-100"
                            >
                                캐시 초기화
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">분석 레코드 밀도</span>
                        <span className="text-[10px] font-black text-slate-500">{recordCount.toLocaleString()} Records</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((storageSize / 5120) * 100, 100)}%` }}
                            className="h-full bg-accent rounded-full shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                        />
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium px-1 italic">* 브라우저 환경에 따라 최대 5MB까지 데이터 저장이 가능합니다.</p>
                </div>
            </div>
        </div>
    )
}
