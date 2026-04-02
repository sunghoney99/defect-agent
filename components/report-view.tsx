"use client"

import { useMemo, useState } from "react"
import { useAnalysis } from "@/context/analysis-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card"
import { ChevronRight, Box, Tag, ArrowLeft, FileText, MessageSquare, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { CauseSelect } from "./cause-select"

type CategoryRow = {
  category: string
  count: number
  cost: number
}

type SelectedProduct = {
  product: string
  category: string
}

export function ReportView() {
  const { currentAnalysis: summary, deleteKeyword } = useAnalysis()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)

  const rows = useMemo<CategoryRow[]>(() => {
    if (!summary || summary.monthlyStats.length === 0) return []

    // Only show the latest month from the current analysis
    const latestStat = summary.monthlyStats[summary.monthlyStats.length - 1]

    return Object.entries(latestStat.categoryBreakdown).map(([category, value]) => ({
      category,
      count: value.count,
      cost: value.cost
    })).sort((a, b) => b.count - a.count)
  }, [summary])

  const maxCount = useMemo(() => Math.max(...rows.map(r => r.count), 0), [rows])

  const detailItems = useMemo(() => {
    if (!summary || !selectedCategory) return []
    const latestMonth = summary.monthlyStats[summary.monthlyStats.length - 1]?.monthKey

    return summary.productCauseMonthlyStats
      .filter(s => s.monthKey === latestMonth && s.normalizedCause === selectedCategory)
      .sort((a, b) => b.totalCount - a.totalCount)
  }, [summary, selectedCategory])

  // Get individual records for selected product
  const productRecords = useMemo(() => {
    if (!summary || !selectedProduct) return []
    const latestMonth = summary.monthlyStats[summary.monthlyStats.length - 1]?.monthKey

    return summary.records
      .filter(r =>
        r.monthKey === latestMonth &&
        r.product === selectedProduct.product &&
        r.normalizedCause === selectedProduct.category
      )
  }, [summary, selectedProduct])

  const handleBackClick = () => {
    if (selectedProduct) {
      setSelectedProduct(null)
    } else {
      setSelectedCategory(null)
    }
  }

  if (!summary || rows.length === 0) return null

  const getTitle = () => {
    if (selectedProduct) return `${selectedProduct.product} 상세 내역`
    if (selectedCategory) return `${selectedCategory} 상세 리스트`
    return "결함 유형 분석"
  }

  const getDescription = () => {
    if (selectedProduct) return "해당 품목의 조치결과특이사항 및 요구내역입니다."
    if (selectedCategory) return "선택한 카테고리의 품목별 발생 비중입니다. 품목을 클릭하면 상세 내역을 확인할 수 있습니다."
    return "발생 건수가 높은 주요 결함 유형 분포입니다."
  }

  return (
    <Card className="bg-white border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 rounded-[3.5rem]">
      <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-10 pb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium text-sm">
              {getDescription()}
            </CardDescription>
          </div>
          {(selectedCategory || selectedProduct) && (
            <button
              onClick={handleBackClick}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 text-white text-[11px] font-black uppercase hover:bg-accent transition-all shadow-lg active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {selectedProduct ? "품목 목록" : "유형 목록"}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-10">
        <AnimatePresence mode="wait">
          {/* Level 1: Category List */}
          {!selectedCategory && !selectedProduct && (
            <motion.div
              key="list"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-5"
            >
              {rows.map((row) => (
                <div
                  key={row.category}
                  onClick={() => setSelectedCategory(row.category)}
                  className="group cursor-pointer space-y-2"
                >
                  <div className="flex items-end justify-between px-1">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span className="text-sm font-black text-slate-700 group-hover:text-accent transition-colors">{row.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {row.category !== "기타" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`'${row.category}' 키워드를 삭제하시겠습니까?\n해당 키워드의 ${row.count}건이 '기타'로 이동됩니다.`)) {
                              deleteKeyword(row.category)
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                          title="키워드 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="text-right">
                        <span className="text-lg font-black text-slate-900">{row.count.toLocaleString()}</span>
                        <span className="text-[10px] ml-1 text-slate-400 font-bold uppercase">건</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.count / maxCount) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-accent rounded-full shadow-[4px_0_12px_rgba(37,99,235,0.3)] relative group-hover:bg-blue-400 transition-colors"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
                    </motion.div>
                  </div>
                </div>
              ))}

              <div className="mt-8 p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <p className="text-[11px] text-amber-700/80 leading-relaxed font-medium">
                  💡 유형을 클릭하면 해당 유형에 포함된 상세 품목 리스트를 확인할 수 있습니다.
                </p>
              </div>
            </motion.div>
          )}

          {/* Level 2: Product List */}
          {selectedCategory && !selectedProduct && (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {detailItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedProduct({ product: item.product, category: selectedCategory })}
                  className="flex items-center justify-between p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-accent/20 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/80 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-accent transition-all shadow-sm rotate-3 group-hover:rotate-0">
                      <Box className="w-6 h-6" />
                    </div>
                    <span className="text-lg font-black text-slate-700 group-hover:text-slate-900 transition-colors">{item.product}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 group-hover:bg-accent/10 transition-colors">
                      <Tag className="w-4 h-4 text-accent" />
                      <span className="text-lg font-black text-slate-900 group-hover:text-accent">{item.totalCount.toLocaleString()}건</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-accent transition-colors" />
                  </div>
                </div>
              ))}

              <div className="md:col-span-2 mt-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <p className="text-[11px] text-blue-700/80 leading-relaxed font-medium">
                  💡 품목을 클릭하면 해당 품목의 조치결과특이사항 및 요구내역을 확인할 수 있습니다.
                </p>
              </div>
            </motion.div>
          )}

          {/* Level 3: Individual Records */}
          {selectedProduct && (
            <motion.div
              key="records"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {productRecords.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-400 font-bold">상세 내역이 없습니다.</p>
                </div>
              ) : (
                <>
                  <div className="text-xs font-bold text-slate-400 px-2 uppercase tracking-widest">
                    총 {productRecords.length}건
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                    {productRecords.map((record, idx) => (
                      <div
                        key={record.id || idx}
                        className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all space-y-4"
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
                          <div className="p-4 rounded-xl bg-white border border-slate-100">
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
                          <div className="p-4 rounded-xl bg-white border border-slate-100">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {record.rawCauseFields?.actionText || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}


