import { AnalysisSummary } from "./types"

export function buildAnalysisContext(summary: AnalysisSummary, targetMonthKey: string): string {
  const lines: string[] = []

  // 월별 하자보수비 추이
  lines.push("### 월별 하자보수비 추이")
  const sortedTotals = [...summary.monthlyTotals].sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  sortedTotals.forEach(t => {
    const breakdown = t.judgementBreakdown
      ? Object.entries(t.judgementBreakdown)
          .map(([k, v]) => `${k}: ${Math.round(v).toLocaleString()}원`)
          .join(", ")
      : ""
    lines.push(`- ${t.monthKey}: 합계 ${Math.round(t.totalCost).toLocaleString()}원${breakdown ? ` (${breakdown})` : ""}`)
  })

  // 분석 대상 월 결함 유형별 건수
  const targetStat = summary.monthlyStats.find(s => s.monthKey === targetMonthKey)
  if (targetStat) {
    lines.push(`\n### ${targetMonthKey} 결함 유형별 건수 (세트교환요구+고객불만 기준)`)
    const sorted = Object.entries(targetStat.categoryBreakdown).sort((a, b) => b[1].count - a[1].count)
    sorted.forEach(([cause, val]) => {
      lines.push(`- ${cause}: ${val.count}건 (${Math.round(val.cost).toLocaleString()}원)`)
    })

    lines.push(`\n### ${targetMonthKey} 판정형태별 건수`)
    const jtSorted = Object.entries(targetStat.judgementCountBreakdown).sort((a, b) => b[1] - a[1])
    jtSorted.forEach(([jt, cnt]) => {
      lines.push(`- ${jt}: ${cnt}건`)
    })
  }

  // 품목별 특이사항 (세트교환요구+고객불만)
  const targetRecords = summary.records.filter(r =>
    r.monthKey === targetMonthKey &&
    (r.judgementType === "세트교환요구" || r.judgementType === "고객불만")
  )

  const productMap = new Map<string, { jt: string; count: number; causes: Record<string, number> }>()
  targetRecords.forEach(r => {
    const key = `${r.judgementType}||${r.product}`
    const existing = productMap.get(key)
    if (!existing) {
      productMap.set(key, { jt: r.judgementType, count: 1, causes: { [r.normalizedCause]: 1 } })
    } else {
      existing.count++
      existing.causes[r.normalizedCause] = (existing.causes[r.normalizedCause] || 0) + 1
    }
  })

  if (productMap.size > 0) {
    lines.push(`\n### ${targetMonthKey} 품목별 특이사항 (세트교환요구+고객불만)`)
    Array.from(productMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .forEach(([key, val]) => {
        const [jt, product] = key.split("||")
        const topCauses = Object.entries(val.causes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([c, n]) => `${c}(${n}건)`)
          .join(", ")
        lines.push(`- [${jt}] ${product}: ${val.count}건 — ${topCauses}`)
      })
  }

  // 전월 대비 증가 항목
  const report = summary.executiveReport
  if (report?.increasedProducts && report.increasedProducts.length > 0) {
    lines.push("\n### 전월 대비 주요 증가 항목")
    report.increasedProducts.slice(0, 5).forEach(h => {
      lines.push(`- ${h.product} / ${h.normalizedCause}: ${h.previousCount}건 → ${h.currentCount}건 (+${h.currentCount - h.previousCount}건)`)
    })
  }

  // 비용 변동
  if (report?.costItemChanges && report.costItemChanges.length > 0) {
    lines.push("\n### 판정항목별 비용 변동 (전월 대비)")
    report.costItemChanges.forEach(c => {
      const sign = c.diff >= 0 ? "+" : ""
      lines.push(`- ${c.item}: ${Math.round(c.prevValue).toLocaleString()}원 → ${Math.round(c.curValue).toLocaleString()}원 (${sign}${Math.round(c.diff).toLocaleString()}원)`)
    })
  }

  return lines.join("\n")
}
