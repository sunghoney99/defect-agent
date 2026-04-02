"use client"

import { useState, useMemo } from "react"
import { useAnalysis } from "@/context/analysis-context"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Tag,
  Box,
  ChevronRight,
  AlertCircle,
  X,
  FileText,
  MessageSquare
} from "lucide-react"
import { CommentSection } from "./comment-section"
import { CauseSelect } from "./cause-select"

type SelectedIncrease = {
  product: string
  normalizedCause: string
  previousCount: number
  currentCount: number
}

type SelectedBreakdownItem = {
  product: string
  judgementType: string
}

export function ExecutiveSummary() {
  const { summary, currentAnalysis } = useAnalysis()
  const [selectedIncrease, setSelectedIncrease] = useState<SelectedIncrease | null>(null)
  const [selectedBreakdownItem, setSelectedBreakdownItem] = useState<SelectedBreakdownItem | null>(null)

  // Get target month key (must be calculated before useMemo to avoid conditional hook)
  const targetMonthKey = currentAnalysis?.monthlyStats?.[currentAnalysis.monthlyStats.length - 1]?.monthKey

  // Get detailed records for selected increase item (hook must be called unconditionally)
  const increaseDetailRecords = useMemo(() => {
    if (!selectedIncrease || !summary || !targetMonthKey) return []
    return summary.records.filter(r =>
      r.monthKey === targetMonthKey &&
      r.product === selectedIncrease.product &&
      r.normalizedCause === selectedIncrease.normalizedCause
    )
  }, [selectedIncrease, summary, targetMonthKey])

  // Get detailed records for selected breakdown item
  const breakdownDetailRecords = useMemo(() => {
    if (!selectedBreakdownItem || !summary || !targetMonthKey) return []
    return summary.records.filter(r =>
      r.monthKey === targetMonthKey &&
      r.product === selectedBreakdownItem.product
    )
  }, [selectedBreakdownItem, summary, targetMonthKey])

  if (!currentAnalysis || !currentAnalysis.executiveReport || !summary) return null
  const report = currentAnalysis.executiveReport
  const breakdown = report.detailedBreakdown || []

  // Get costs from the overall summary to find previous month context
  const allTotals = summary.monthlyTotals
  const targetIdx = allTotals.findIndex(t => t.monthKey === targetMonthKey)

  const latestMonth = allTotals[targetIdx]
  const prevMonth = targetIdx > 0 ? allTotals[targetIdx - 1] : null

  const curCost = latestMonth?.totalCost || 0
  const prevCost = prevMonth?.totalCost || 0
  const costDiff = curCost - prevCost
  const costRatio = prevCost > 0 ? (costDiff / prevCost) * 100 : 0

  // Get sales data from monthly totals
  const curSales = latestMonth?.monthlySales || 0
  const prevSales = prevMonth?.monthlySales || 0
  const curSalesRatioRaw = curSales > 0 ? (curCost / curSales) * 100 : 0
  const prevSalesRatioRaw = prevSales > 0 ? (prevCost / prevSales) * 100 : 0
  // Round to 1 decimal place first, then compute diff from rounded values to avoid display mismatch
  const curSalesRatio = Math.round(curSalesRatioRaw * 10) / 10
  const prevSalesRatio = Math.round(prevSalesRatioRaw * 10) / 10
  const salesRatioDiff = Math.round((curSalesRatio - prevSalesRatio) * 10) / 10

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 overflow-hidden relative group shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-3xl -mr-32 -mt-32 group-hover:bg-accent/10 transition-colors duration-700" />
        <CardHeader className="border-b border-slate-100 bg-slate-50/30">
          <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tighter">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-accent" />
            </div>
            금월 하자보수비 핵심 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          {/* Comment Section */}
          {targetMonthKey && (
            <div className="mb-8">
              <CommentSection monthKey={targetMonthKey} />
            </div>
          )}

          {/* Top Monthly Stats */}
          <div className="mb-8 p-6 rounded-[2rem] bg-slate-50 border border-slate-200/60 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-4 bg-accent rounded-full" />
              <h3 className="text-sm font-black text-slate-700">({latestMonth?.monthKey}) 하자보수비 현황</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">전월 하자보수비</p>
                <p className="text-lg font-black text-slate-900">{Math.round(prevCost).toLocaleString()}원</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">당월 하자보수비</p>
                <p className="text-lg font-black text-accent">{Math.round(curCost).toLocaleString()}원</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/50 space-y-2">
              <div className="flex items-center gap-3">
                {costDiff > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-blue-500" />}
                <p className="text-sm font-bold text-slate-700">
                  전월 대비 전체 하자보수비가 <span className={costDiff > 0 ? "text-red-500" : "text-blue-500"}>
                    {Math.abs(Math.round(costRatio * 10) / 10)}% {costDiff > 0 ? "증가(+)" : "감소(-)"}
                  </span>하였습니다.
                </p>
              </div>
              {curSales > 0 ? (
                <div className="flex items-center gap-3">
                  {salesRatioDiff > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : salesRatioDiff < 0 ? <TrendingDown className="w-4 h-4 text-blue-500" /> : <Minus className="w-4 h-4 text-slate-400" />}
                  <p className="text-sm font-bold text-slate-700">
                    매출 대비 하자보수비 비중은 <span className="text-accent font-black">{curSalesRatio}%</span>로,
                    {prevSales > 0 ? (
                      <>
                        {" "}전월(<span className="text-slate-500">{prevSalesRatio}%</span>) 대비{" "}
                        <span className={salesRatioDiff > 0 ? "text-red-500" : salesRatioDiff < 0 ? "text-blue-500" : "text-slate-500"}>
                          {Math.abs(salesRatioDiff)}%p {salesRatioDiff > 0 ? "증가" : salesRatioDiff < 0 ? "감소" : "동일"}
                        </span>하였습니다.
                      </>
                    ) : (
                      " 전월 매출 데이터가 없어 비교가 불가합니다."
                    )}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500 italic">
                    * 매출 데이터가 엑셀 파일에 포함되어 있지 않아 비용 추이 중심으로 분석되었습니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Updated: Prominent Cost Item Breakdown */}
          {report.costItemChanges && report.costItemChanges.length > 0 && (
            <div className="mb-12 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-4 bg-accent rounded-full" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">항목별 하자보수비 변동 내역 (전월 대비)</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {report.costItemChanges.map((change) => {
                  const isIncrease = change.diff > 0
                  const color = isIncrease ? "text-red-500" : change.diff < 0 ? "text-emerald-500" : "text-slate-400"
                  const bg = isIncrease ? "bg-red-50/30" : change.diff < 0 ? "bg-emerald-50/30" : "bg-slate-50/30"
                  const border = isIncrease ? "border-red-100" : change.diff < 0 ? "border-emerald-100" : "border-slate-100"

                  // Label mapping for display
                  let displayItem = change.item.toUpperCase()
                  if (displayItem === "영업지원") displayItem = "영업지원(BS)"
                  if (displayItem === "전체") displayItem = "전체 하자보수비"

                  return (
                    <div
                      key={change.item}
                      className={`p-6 rounded-[2rem] border ${border} ${bg} transition-all hover:shadow-lg hover:bg-white group/cost`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-hover/cost:text-slate-600 transition-colors">
                          {displayItem}
                        </p>
                        <div className={`flex items-center gap-1 ${color} px-2 py-1 rounded-lg bg-white/80 border border-inherit text-[10px] font-black`}>
                          {isIncrease ? <TrendingUp className="w-3 h-3" /> : change.diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {Math.abs(Math.round(change.ratio * 100))}%
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-2xl font-black text-slate-900 tracking-tighter">
                          {Math.round(change.curValue).toLocaleString()}
                          <span className="text-xs ml-1 font-bold text-slate-400">원</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          전월: {Math.round(change.prevValue).toLocaleString()}원
                        </p>
                      </div>

                      {/* Micro trend bar */}
                      <div className="mt-4 h-1 w-full bg-slate-200/50 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: change.prevValue > 0 ? `${Math.min(100, (change.curValue / (Math.max(change.curValue, change.prevValue))) * 100)}%` : "100%" }}
                          className={`h-full ${isIncrease ? 'bg-red-400' : 'bg-emerald-400'}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Detailed Breakdown Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">[품목별 특이사항 보고]</h3>
              </div>
              {selectedBreakdownItem && (
                <button
                  onClick={() => setSelectedBreakdownItem(null)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase hover:bg-accent transition-all"
                >
                  <X className="w-3 h-3" />
                  목록으로
                </button>
              )}
            </div>
            {!selectedBreakdownItem && (
              <p className="text-[10px] text-slate-400 font-bold px-1 -mt-6 uppercase">* 월 5건 이상 발생 건만 집계</p>
            )}

            {breakdown.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">분석된 특이사항이 없습니다 (5건 미만)</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {!selectedBreakdownItem ? (
                  <motion.div
                    key="breakdown-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-8 px-1"
                  >
                    {breakdown.map((group, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="w-5 h-5 text-accent" />
                          <h4 className="text-base font-black text-slate-800">▶ {group.judgementType}</h4>
                        </div>

                        <div className="grid gap-4 pl-7">
                          {group.products.map((item, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => setSelectedBreakdownItem({ product: item.product, judgementType: group.judgementType })}
                              className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-accent/30 shadow-sm transition-all group/item cursor-pointer hover:shadow-lg"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <span className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover/item:bg-accent group-hover/item:text-white transition-colors">
                                    {pIdx + 1}
                                  </span>
                                  <span className="text-sm font-black text-slate-800">{item.product}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-accent">{item.count}건</span>
                                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-accent transition-colors" />
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                {item.reasons.map((r, rIdx) => (
                                  <div key={rIdx} className="flex items-center gap-1">
                                    <span className="text-xs font-medium text-slate-500">
                                      {r.cause} <span className="text-accent font-black">{r.count}</span>
                                    </span>
                                    {rIdx < item.reasons.length - 1 && <span className="text-slate-300 mx-1">/</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <p className="text-[11px] text-amber-700/80 leading-relaxed font-medium">
                        💡 품목을 클릭하면 해당 건의 요구내역 및 조치결과특이사항을 확인할 수 있습니다.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="breakdown-detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Selected Item Header */}
                    <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-800">{selectedBreakdownItem.product}</p>
                        <p className="text-xs font-bold text-accent">{selectedBreakdownItem.judgementType}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-accent">{breakdownDetailRecords.length}건</span>
                      </div>
                    </div>

                    {/* Detail Records */}
                    <div className="text-xs font-bold text-slate-400 px-2 uppercase tracking-widest">
                      당월 발생 건수: {breakdownDetailRecords.length}건
                    </div>

                    {breakdownDetailRecords.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400 font-bold">상세 내역이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {breakdownDetailRecords.map((record, idx) => (
                          <div
                            key={record.id || idx}
                            className="p-5 rounded-2xl bg-white border border-slate-100 hover:shadow-lg transition-all space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-black">
                                  #{idx + 1}
                                </span>
                                <CauseSelect value={record.normalizedCause} recordId={record.id} />
                              </div>
                              {record.extraFields?.orderNo && (
                                <span className="text-xs text-slate-400 font-medium">
                                  접수번호: {record.extraFields.orderNo}
                                </span>
                              )}
                            </div>

                            {/* 요구내역 */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">요구내역</span>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {record.rawCauseFields?.requestText || "-"}
                                </p>
                              </div>
                            </div>

                            {/* 조치결과특이사항 */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">조치결과특이사항</span>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {record.rawCauseFields?.actionText || "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* New: Significant Increase Highlights */}
          {prevMonth && (report.increasedProducts?.length > 0 || report.increasedCauses?.length > 0) && (
            <div className="mt-12 pt-8 border-t border-slate-100 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">[전월 대비 주요 증가 항목]</h3>
                </div>
                {selectedIncrease && (
                  <button
                    onClick={() => setSelectedIncrease(null)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase hover:bg-accent transition-all"
                  >
                    <X className="w-3 h-3" />
                    목록으로
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!selectedIncrease ? (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {(() => {
                      // Merge and deduplicate by product + cause
                      const highlights = [...(report.increasedProducts || []), ...(report.increasedCauses || [])];
                      const seen = new Set();
                      return highlights
                        .filter(h => {
                          const key = `${h.product}|${h.normalizedCause}`;
                          if (seen.has(key)) return false;
                          seen.add(key);
                          return true;
                        })
                        .sort((a, b) => (b.currentCount - b.previousCount) - (a.currentCount - a.previousCount))
                        .slice(0, 6)
                        .map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedIncrease({
                              product: item.product,
                              normalizedCause: item.normalizedCause,
                              previousCount: item.previousCount,
                              currentCount: item.currentCount
                            })}
                            className="p-4 rounded-2xl bg-red-50/50 border border-red-100 flex items-center justify-between group/item hover:bg-red-50 hover:border-red-200 hover:shadow-lg transition-all cursor-pointer"
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-800">{item.product}</p>
                              <p className="text-[10px] font-bold text-slate-400">{item.normalizedCause}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-red-500 justify-end">
                                  <TrendingUp className="w-3 h-3" />
                                  <span className="text-xs font-black">+{item.currentCount - item.previousCount}건</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400">{item.previousCount}건 → {item.currentCount}건</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover/item:text-red-400 transition-colors" />
                            </div>
                          </div>
                        ));
                    })()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    {/* Selected Item Header */}
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-800">{selectedIncrease.product}</p>
                        <p className="text-xs font-bold text-red-500">{selectedIncrease.normalizedCause}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-red-500 justify-end">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-black">+{selectedIncrease.currentCount - selectedIncrease.previousCount}건 증가</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400">{selectedIncrease.previousCount}건 → {selectedIncrease.currentCount}건</p>
                      </div>
                    </div>

                    {/* Detail Records */}
                    <div className="text-xs font-bold text-slate-400 px-2 uppercase tracking-widest">
                      당월 발생 건수: {increaseDetailRecords.length}건
                    </div>

                    {increaseDetailRecords.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-400 font-bold">상세 내역이 없습니다.</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {increaseDetailRecords.map((record, idx) => (
                          <div
                            key={record.id || idx}
                            className="p-5 rounded-2xl bg-white border border-slate-100 hover:shadow-lg transition-all space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="px-3 py-1 rounded-lg bg-red-50 text-red-500 text-xs font-black">
                                  #{idx + 1}
                                </span>
                                <CauseSelect value={record.normalizedCause} recordId={record.id} />
                              </div>
                              {record.extraFields?.orderNo && (
                                <span className="text-xs text-slate-400 font-medium">
                                  접수번호: {record.extraFields.orderNo}
                                </span>
                              )}
                            </div>

                            {/* 요구내역 */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">요구내역</span>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {record.rawCauseFields?.requestText || "-"}
                                </p>
                              </div>
                            </div>

                            {/* 조치결과특이사항 */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500" />
                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">조치결과특이사항</span>
                              </div>
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                  {record.rawCauseFields?.actionText || "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {!selectedIncrease && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <p className="text-[11px] text-amber-700/80 leading-relaxed font-medium">
                    💡 항목을 클릭하면 해당 건의 요구내역 및 조치결과특이사항을 확인할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
