import { read, utils } from "xlsx"
import {
  AnalysisSummary,
  DefectRecord,
  ExecutiveReport,
  InsightHighlight,
  MoMChange,
  JudgementChange,
  MonthlyStat,
  MonthlyTotal,
  ProductCauseMonthlyStat
} from "./types"

type SheetInfo = {
  month: string
  monthKey: string
  amountSheetName: string | null
  detailSheetName: string | null
}

function normalizeHeader(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, "").toLowerCase()
}

function parseMonthFromSheetName(name: string): string | null {
  const match = name.match(/(\d{1,2})월/)
  if (match) return match[1]
  return null
}

function parseYearFromFileName(fileName: string): number {
  // Try to match "25년" or "2025년" patterns
  const shortYearMatch = fileName.match(/(\d{2})년/)
  if (shortYearMatch) {
    const shortYear = parseInt(shortYearMatch[1], 10)
    // Convert 2-digit year to 4-digit (assuming 20xx for years < 50, 19xx otherwise)
    return shortYear < 50 ? 2000 + shortYear : 1900 + shortYear
  }

  // Try to match "2025" pattern (4-digit year)
  const fullYearMatch = fileName.match(/20(\d{2})/)
  if (fullYearMatch) {
    return parseInt(`20${fullYearMatch[1]}`, 10)
  }

  // Fallback to current year
  return new Date().getFullYear()
}

function toMonthKey(month: string, year: number) {
  return `${year}-${month.padStart(2, "0")}`
}

function parseCost(value: unknown) {
  if (value == null) return 0
  if (typeof value === "number") return value
  const text = String(value).replace(/[^0-9.-]/g, "")
  const parsed = parseFloat(text)
  if (isNaN(parsed)) return 0
  return parsed
}

const CAUSE_KEYWORDS: Record<string, string[]> = {
  "상판 휨": ["상판휨", "상판 휨", "상판변형", "상판뒤틀림"],
  "높이 조절 기능 이상": ["높이조절", "높이 조절", "업다운", "하강", "상승", "스트로크", "액추에이터"],
  "높이 조절 소음": ["높이조절소음", "높이조절 소음", "높이 조절 소음", "업다운소음", "업다운 소음", "상승소음", "하강소음", "승강소음", "승강 소음"],
  "고주파음 불만": ["고주파", "삐소리", "고주파음"],
  "푸시레일 전선 늘어남": ["전선늘어남", "전선 늘어남", "배선간섭"],
  "푸시레일 이상": ["푸시레일", "푸시 레일", "조명레일", "조명 레일"],
  "서랍 레일 이상": ["서랍레일", "서랍 레일", "서랍인출", "서랍 인출", "레일불량", "레일파손", "레일 불량", "레일 파손"],
  "수분에 의한 LPM 부풀어오름": ["부풀", "들뜸", "팽창", "습기", "수분", "lpm", "엣지", "edge"],
  "멀티탭 스파크": ["멀티탭", "스파크", "불꽃", "쇼트"],
  "가스실린더 유압 불만": ["가스실린더", "실린더", "유압"],
  "다리 오일 누유": ["누유", "기름", "오일"],
  "목제 체결부 파손": ["체결부", "나사산", "볼트구멍", "피스구멍"],
  "목제 도장 불량": ["도장", "도색", "칠부족", "표면거침", "도장불량", "목제 도장"],
  "목제 찍힘": ["찍힘", "목제찍힘", "목재찍힘"],
  "목제 파손": ["파손", "목제파손", "부러짐"],
  "목제 얼룩": ["얼룩", "자국"],
  "목제 오염": ["오염", "지저분"],
  "모터 소음 불만": ["모터", "소음", "웅웅", "진동"],
  "스위치 기능 이상": ["스위치", "버튼", "컨트롤러"],
  "전원 불량": ["전원", "전원불량", "작동불가", "전기"],
  "시공 불량": ["시공", "시공불량", "오시공", "재시공", "설치오류", "설치미흡"],
  "냄새 불만": ["냄새", "악취", "눈시림"],
  "자력 불만": ["자력", "자석", "마그넷"],
  "흔들림 불만": ["흔들림", "수평불량", "균형", "유격"],
  "에러 발생": ["에러", "error"],
  "제조 불량": ["제조", "가공", "타공", "홀", "단차", "어긋남"],
  "부품 누락": ["누락", "미동봉"],
  "단순 변심": ["변심", "단순", "취소"],
  "패브릭 변색": ["패브릭", "변색", "탈색", "색빠짐", "색상변화"],
  "보드 스크래치": ["스크래치", "긁힘", "스크레치", "보드스크래치"],
  "모니터암 장력 이상": ["모니터암", "장력", "암장력", "모니터 암"],
  "디바이더 고정 불만": ["디바이더", "고정불량", "디바이더고정", "디바이더 고정"],
  "파티션 목골 불만": ["목골", "파티션목골", "파티션 목골"],
  "부품 분실": ["분실", "부품분실", "부품 분실"],
  "스크린 파임": ["스크린", "파임", "스크린파임", "스크린 파임"],
  "테이블 흔들림": ["테이블흔들림", "테이블 흔들림", "책상흔들림"],
  "생산 불만": ["생산불만", "생산 불만", "생산품질", "생산이슈", "제조 불만", "제조불만", "재단 불량", "재단불량"],
  "고객 오주문": ["오주문", "고객오주문", "고객 오주문", "주문오류"],
  "블루투스 기능 이상": ["블루투스", "bluetooth", "bt연결", "무선연결", "페어링"],
  "암패드 갈라짐": ["암패드", "암패드갈라짐", "암패드 갈라짐", "패드갈라짐", "패드 갈라짐"],
  "메쉬 이탈": ["메쉬", "메쉬이탈", "메쉬 이탈", "망이탈"],
  "벌레 나옴": ["벌레", "벌레나옴", "해충", "벌레 나옴", "곤충"],
  "펠트 배선트레이 휨": ["펠트", "배선트레이", "펠트휨", "트레이휨", "배선트레이 휨"],
  "이물질 삽입": ["이물질", "이물", "이물질삽입", "이물질 삽입"]
}

function extractKeywords(text: string): string {
  if (!text) return "기타"

  for (const [cause, keywords] of Object.entries(CAUSE_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) {
      return cause
    }
  }

  return "기타"
}

export async function analyzeFile(file: File): Promise<AnalysisSummary> {
  const buffer = await file.arrayBuffer()
  const workbook = read(buffer, { type: "array" })

  // Extract year from filename (e.g., "하자보수비(브랜드)_25년09월.xlsx" → 2025)
  const fileYear = parseYearFromFileName(file.name)

  // 1. Identify Sheets
  const sheetInfos: SheetInfo[] = []
  workbook.SheetNames.forEach(name => {
    const month = parseMonthFromSheetName(name)
    if (!month) return

    let info = sheetInfos.find(i => i.month === month)
    if (!info) {
      info = { month, monthKey: toMonthKey(month, fileYear), amountSheetName: null, detailSheetName: null }
      sheetInfos.push(info)
    }

    if (name.includes("하자보수비 금액")) {
      info.amountSheetName = name
    } else {
      info.detailSheetName = name
    }
  })

  const records: DefectRecord[] = []
  const monthlyTotals: MonthlyTotal[] = []

  // 2. Process each month
  for (const info of sheetInfos) {
    // Process Amount Sheet (Sheet 1)
    if (info.amountSheetName) {
      const sheet = workbook.Sheets[info.amountSheetName]
      const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      if (rows.length > 1) {
        const headers = rows[0].map(h => normalizeHeader(h))
        const dataRow = rows[1]

        const targetKeys = ["r&d", "고객불만", "사양재검토", "세트교환요구", "영업지원", "전체"]
        const breakdown: Record<string, number> = {}
        let totalCost = 0

        targetKeys.forEach(key => {
          let foundIdx = -1

          // Special handling for each key to match the most likely header
          if (key === "영업지원") {
            // Match "영업지원", "영업지원(BS)", "BS" etc.
            foundIdx = headers.findIndex(h =>
              h.includes("영업지원") || h === "bs" || h.includes("(bs)")
            )
          } else if (key === "전체") {
            // Try to find exact "전체" first, then any that includes it
            foundIdx = headers.indexOf("전체")
            if (foundIdx === -1) {
              foundIdx = headers.findIndex(h => h === "전체" || h === "합계" || h === "총계")
            }
          } else if (key === "r&d") {
            foundIdx = headers.findIndex(h => h.includes("r&d") || h.includes("rnd"))
          } else {
            foundIdx = headers.findIndex(h => h.includes(normalizeHeader(key)))
          }

          if (foundIdx !== -1) {
            const val = parseCost(dataRow[foundIdx])
            breakdown[key] = val
            if (key === "전체") totalCost = val
          }
        })

        if (Object.keys(breakdown).length > 0) {
          monthlyTotals.push({
            monthKey: info.monthKey,
            totalCost: totalCost || breakdown["전체"] || 0,
            judgementBreakdown: breakdown,
            source: "summarySheet"
          })
        }
      }
    }

    // Process Detail Sheet (Sheet 2)
    if (info.detailSheetName) {
      const sheet = workbook.Sheets[info.detailSheetName]
      const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][]
      if (rows.length > 1) {
        const headers = rows[0].map(h => normalizeHeader(h))

        // Try to find judgement form column - handle combined header case
        let judgementFormIdx = headers.findIndex(h => h === "판정형태")
        if (judgementFormIdx === -1) {
          judgementFormIdx = headers.findIndex(h => h.includes("판정형태") && !h.includes("판정구분"))
        }
        // If still not found, check for combined header but look for separate 판정구분
        const judgementClassOnlyIdx = headers.findIndex(h => h === "판정구분")

        // If we have a combined header like "판정형태-판정구분", the actual values might be elsewhere
        // Try to use judgementClassOnlyIdx if judgementFormIdx gives numeric values
        const combinedHeaderIdx = headers.findIndex(h => h.includes("판정형태") && h.includes("판정구분"))
        const judgementClassIdx = headers.findIndex(h => h.includes("판정구분"))
        const orderNoIdx = headers.findIndex(h => h.includes("접수한번호") || h.includes("접수번호"))
        const partNameIdx = headers.findIndex(h => h.includes("부품명"))
        const productCodeIdx = headers.findIndex(h => h.includes("제품코드"))
        const actionIdx = headers.findIndex(h => h.includes("조치결과특이사항"))
        const requestIdx = headers.findIndex(h => h.includes("요구내역"))
        const productIdx = headers.findIndex(h => h.includes("품목"))

        // Find cost index if it exists in detail sheet
        const costIdx = headers.findIndex(h => h.includes("금액") || h.includes("비용"))

        rows.slice(1).forEach((row, rowIndex) => {
          if (!row || row.length === 0) return

          // Try multiple sources for judgement type
          let rawJudgement = ""
          if (judgementFormIdx !== -1) {
            rawJudgement = String(row[judgementFormIdx] || "")
          }
          // If the value is numeric or empty, try judgementClassOnlyIdx
          if ((!rawJudgement || /^\d+$/.test(rawJudgement)) && judgementClassOnlyIdx !== -1) {
            rawJudgement = String(row[judgementClassOnlyIdx] || "")
          }
          // Also try scanning the row for known values
          if (!rawJudgement || /^\d+$/.test(rawJudgement)) {
            for (const cell of row) {
              const cellStr = String(cell || "")
              if (cellStr.includes("세트교환") || cellStr.includes("고객불만") ||
                  cellStr.includes("R&D") || cellStr.includes("사양재검토") || cellStr.includes("영업지원")) {
                rawJudgement = cellStr
                break
              }
            }
          }

          let judgement = rawJudgement.trim()
          if (judgement.includes("세트교환")) judgement = "세트교환요구"
          if (judgement.includes("고객불만")) judgement = "고객불만"
          const actionText = actionIdx !== -1 ? String(row[actionIdx] || "") : ""
          const requestText = requestIdx !== -1 ? String(row[requestIdx] || "") : ""
          const product = productIdx !== -1 ? String(row[productIdx] || "") : ""
          const cost = costIdx !== -1 ? parseCost(row[costIdx]) : 0

          const combinedText = `${requestText} ${actionText}`
          const normalizedCause = extractKeywords(combinedText)

          records.push({
            id: `${info.monthKey}-${rowIndex}`,
            monthKey: info.monthKey,
            cost,
            description: combinedText.trim(),
            normalizedCause,
            rawCauseFields: {
              requestText,
              actionText
            },
            product,
            judgementType: judgement,
            extraFields: {
              orderNo: orderNoIdx !== -1 ? String(row[orderNoIdx] || "") : "",
              partName: partNameIdx !== -1 ? String(row[partNameIdx] || "") : "",
              productCode: productCodeIdx !== -1 ? String(row[productCodeIdx] || "") : "",
              judgementForm: rawJudgement,
              judgementClass: judgementClassIdx !== -1 ? String(row[judgementClassIdx] || "") : ""
            }
          })
        })
      }
    }
  }

  // Fallback for monthly totals if amount sheet was missing
  if (monthlyTotals.length === 0 && records.length > 0) {
    const detailTotals = buildMonthlyTotalsFromDetail(records)
    detailTotals.forEach(t => monthlyTotals.push(t))
  }

  const monthlyStats = buildMonthlyStats(records)
  const categories = Array.from(new Set(records.map(r => r.normalizedCause)))
  const productCauseMonthlyStats = buildProductCauseMonthlyStats(records)

  const executiveReport = buildExecutiveReport(
    productCauseMonthlyStats,
    monthlyTotals,
    records
  )

  return {
    records,
    monthlyStats,
    categories,
    productCauseMonthlyStats,
    monthlyTotals,
    executiveReport
  }
}

function buildMonthlyStats(records: DefectRecord[]): MonthlyStat[] {
  const map = new Map<string, MonthlyStat>()

  records.forEach((record) => {
    const existing = map.get(record.monthKey)
    if (!existing) {
      map.set(record.monthKey, {
        monthKey: record.monthKey,
        totalCost: record.cost,
        totalCount: 1,
        categoryBreakdown: {
          [record.normalizedCause]: { count: 1, cost: record.cost }
        },
        judgementCountBreakdown: {
          [record.judgementType || "기타"]: 1
        }
      })
      return
    }

    existing.totalCount += 1
    existing.totalCost += record.cost

    // Category Breakdown
    const cause = record.normalizedCause
    if (!existing.categoryBreakdown[cause]) {
      existing.categoryBreakdown[cause] = { count: 1, cost: record.cost }
    } else {
      existing.categoryBreakdown[cause].count += 1
      existing.categoryBreakdown[cause].cost += record.cost
    }

    // Judgement Count Breakdown
    const jtKey = record.judgementType || "기타"
    existing.judgementCountBreakdown[jtKey] = (existing.judgementCountBreakdown[jtKey] || 0) + 1
  })

  return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

function buildProductCauseMonthlyStats(records: DefectRecord[]): ProductCauseMonthlyStat[] {
  const map = new Map<string, ProductCauseMonthlyStat>()

  records.forEach((record) => {
    const key = `${record.monthKey}|${record.product}|${record.normalizedCause}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        monthKey: record.monthKey,
        product: record.product,
        normalizedCause: record.normalizedCause,
        totalCost: record.cost,
        totalCount: 1,
        byJudgementType: {
          [record.judgementType || "기타"]: {
            count: 1,
            cost: record.cost
          }
        }
      })
      return
    }

    existing.totalCount += 1
    existing.totalCost += record.cost
    const jtKey = record.judgementType || "기타"
    if (!existing.byJudgementType[jtKey]) {
      existing.byJudgementType[jtKey] = { count: 1, cost: record.cost }
    } else {
      existing.byJudgementType[jtKey].count += 1
      existing.byJudgementType[jtKey].cost += record.cost
    }
  })

  return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

function buildMonthlyTotalsFromDetail(records: DefectRecord[]): MonthlyTotal[] {
  const map = new Map<string, number>()
  records.forEach(r => {
    map.set(r.monthKey, (map.get(r.monthKey) || 0) + r.cost)
  })
  return Array.from(map.entries()).map(([monthKey, totalCost]) => ({
    monthKey,
    totalCost,
    source: "detail"
  }))
}

export function buildExecutiveReport(
  productCauseMonthlyStats: ProductCauseMonthlyStat[],
  monthlyTotals: MonthlyTotal[],
  records: DefectRecord[],
  targetMonthKey?: string
): ExecutiveReport | null {
  if (!productCauseMonthlyStats.length || !monthlyTotals.length) return null

  const months = Array.from(new Set(monthlyTotals.map(t => t.monthKey))).sort()
  const focusMonth = targetMonthKey || months[months.length - 1]
  const focusIdx = months.indexOf(focusMonth)
  const relevantMonths = months.slice(0, focusIdx + 1)

  // Logic for comparison report
  const totalCostChanges = relevantMonths.length >= 2 ? buildTotalCostChanges(monthlyTotals, relevantMonths) : []
  const judgementTypeChanges = relevantMonths.length >= 2 ? buildJudgementChanges(monthlyTotals, relevantMonths) : []

  const increasedProducts = findIncreasedHighlights(productCauseMonthlyStats, relevantMonths, "product")
  const increasedCauses = findIncreasedHighlights(productCauseMonthlyStats, relevantMonths, "cause")
  const heavyDefectProducts = findHeavyDefectProducts(productCauseMonthlyStats, relevantMonths)

  // Custom Top Product x Cause pairs for the focus month
  const topPairs = productCauseMonthlyStats
    .filter(s => s.monthKey === focusMonth)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5)
    .map(s => ({ product: s.product, cause: s.normalizedCause, count: s.totalCount }))

  const summarySentences = buildSummarySentences(totalCostChanges, judgementTypeChanges, increasedProducts, increasedCauses)

  // Detailed breakdown for the focus month
  const detailedBreakdown = buildDetailedBreakdown(records, focusMonth)

  // Cost Item Changes (Specific categories comparison)
  const costItemChanges = buildCostItemChanges(monthlyTotals, relevantMonths)

  return {
    summarySentences,
    increasedProducts,
    increasedCauses,
    heavyDefectProducts,
    totalCostChanges,
    judgementTypeChanges,
    topProductCausePairs: topPairs,
    detailedBreakdown,
    costItemChanges
  }
}

function buildCostItemChanges(totals: MonthlyTotal[], months: string[]) {
  if (months.length < 2) return []

  const curKey = months[months.length - 1]
  const prevKey = months[months.length - 2]

  const curTotal = totals.find(t => t.monthKey === curKey)
  const prevTotal = totals.find(t => t.monthKey === prevKey)

  if (!curTotal?.judgementBreakdown || !prevTotal?.judgementBreakdown) return []

  const targetKeys = ["r&d", "고객불만", "사양재검토", "세트교환요구", "영업지원", "전체"]

  return targetKeys.map(key => {
    const cv = curTotal.judgementBreakdown?.[key] || 0
    const pv = prevTotal.judgementBreakdown?.[key] || 0
    const diff = cv - pv
    return {
      item: key,
      prevValue: pv,
      curValue: cv,
      diff,
      ratio: pv === 0 ? 0 : diff / pv
    }
  })
}

function buildDetailedBreakdown(records: DefectRecord[], monthKey: string) {
  const latestRecords = records.filter(r => r.monthKey === monthKey)
  const judgementTypes = Array.from(new Set(latestRecords.map(r => r.judgementType || "기타")))

  return judgementTypes.map(jt => {
    const jtRecords = latestRecords.filter(r => (r.judgementType || "기타") === jt)
    const products = Array.from(new Set(jtRecords.map(r => r.product)))

    const productItems = products.map(p => {
      const pRecords = jtRecords.filter(r => r.product === p)
      const reasonsMap = new Map<string, number>()
      pRecords.forEach(r => {
        reasonsMap.set(r.normalizedCause, (reasonsMap.get(r.normalizedCause) || 0) + 1)
      })

      return {
        product: p,
        count: pRecords.length,
        reasons: Array.from(reasonsMap.entries())
          .map(([cause, count]) => ({ cause, count }))
          .sort((a, b) => b.count - a.count)
      }
    })
      .filter(item => item.count >= 5)
      .sort((a, b) => b.count - a.count)

    return {
      judgementType: jt,
      products: productItems
    }
  }).filter(b => b.products.length > 0)
}

function buildTotalCostChanges(totals: MonthlyTotal[], months: string[]): MoMChange[] {
  const map = new Map<string, number>()
  totals.forEach(t => map.set(t.monthKey, t.totalCost))

  const changes: MoMChange[] = []
  for (let i = 1; i < months.length; i++) {
    const base = months[i - 1]
    const target = months[i]
    const bv = map.get(base) || 0
    const tv = map.get(target) || 0
    const diff = tv - bv
    changes.push({
      baseMonth: base,
      targetMonth: target,
      baseValue: bv,
      targetValue: tv,
      diff,
      ratio: bv === 0 ? 0 : diff / bv
    })
  }
  return changes
}

function buildJudgementChanges(totals: MonthlyTotal[], months: string[]): JudgementChange[] {
  if (months.length < 2) return []

  const lastMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]

  const lastTotal = totals.find(t => t.monthKey === lastMonth)
  const prevTotal = totals.find(t => t.monthKey === prevMonth)

  if (!lastTotal?.judgementBreakdown || !prevTotal?.judgementBreakdown) return []

  const changes: JudgementChange[] = []
  const types = Array.from(new Set([
    ...Object.keys(lastTotal.judgementBreakdown),
    ...Object.keys(prevTotal.judgementBreakdown)
  ]))

  types.forEach(type => {
    const bv = prevTotal.judgementBreakdown?.[type] || 0
    const tv = lastTotal.judgementBreakdown?.[type] || 0
    const diff = tv - bv
    changes.push({
      judgementType: type,
      baseMonth: prevMonth,
      targetMonth: lastMonth,
      baseValue: bv,
      targetValue: tv,
      diff,
      ratio: bv === 0 ? 0 : diff / bv
    })
  })

  return changes
}

function findIncreasedHighlights(stats: ProductCauseMonthlyStat[], months: string[], mode: "product" | "cause"): InsightHighlight[] {
  if (months.length < 2) return []
  const lastMonth = months[months.length - 1]
  const prevMonth = months[months.length - 2]

  const currentMap = new Map<string, number>()
  const prevMap = new Map<string, number>()

  stats.forEach(s => {
    const label = mode === "product" ? `${s.product}|${s.normalizedCause}` : `${s.normalizedCause}|${s.product}`
    if (s.monthKey === lastMonth) currentMap.set(label, (currentMap.get(label) || 0) + s.totalCount)
    if (s.monthKey === prevMonth) prevMap.set(label, (prevMap.get(label) || 0) + s.totalCount)
  })

  const highlights: InsightHighlight[] = []
  currentMap.forEach((count, label) => {
    const prevCount = prevMap.get(label) || 0
    if (count > prevCount) {
      const [first, second] = label.split("|")
      highlights.push({
        monthKey: lastMonth,
        product: mode === "product" ? first : second,
        normalizedCause: mode === "product" ? second : first,
        previousCount: prevCount,
        currentCount: count
      })
    }
  })

  return highlights.sort((a, b) => b.currentCount - a.currentCount).slice(0, 5)
}

function findHeavyDefectProducts(stats: ProductCauseMonthlyStat[], months: string[]) {
  const counts = new Map<string, number>()
  stats.forEach(s => {
    const key = `${s.monthKey}|${s.product}`
    counts.set(key, (counts.get(key) || 0) + s.totalCount)
  })

  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [monthKey, product] = key.split("|")
      return { monthKey, product, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function buildSummarySentences(
  changes: MoMChange[],
  judgementChanges: JudgementChange[],
  prodHigh: InsightHighlight[],
  causeHigh: InsightHighlight[]
): string[] {
  const sentences: string[] = []

  if (changes.length > 0) {
    const last = changes[changes.length - 1]
    const dir = last.diff > 0 ? "증가" : "감소"
    sentences.push(`${last.targetMonth} 하자보수비는 전월 대비 ${Math.abs(Math.round(last.ratio * 100))}% ${dir}했습니다.`)
  }

  if (judgementChanges.length > 0) {
    const significant = judgementChanges
      .filter(c => Math.abs(c.diff) > 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 2)

    if (significant.length > 0) {
      const parts = significant.map(c =>
        `'${c.judgementType}'(${c.diff > 0 ? "+" : ""}${c.diff.toLocaleString()}원)`
      )
      sentences.push(`판정항목별로는 ${parts.join(", ")}의 변동이 두드러집니다.`)
    }
  }

  if (prodHigh.length > 0) {
    sentences.push(`주요 이슈 품목은 ${prodHigh[0].product}으로, '${prodHigh[0].normalizedCause}' 사유가 증가했습니다.`)
  }

  return sentences
}
