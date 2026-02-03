export type DefectRecord = {
  id: string
  date?: string
  monthKey: string
  cost: number
  description: string
  normalizedCause: string
  rawCauseFields: {
    requestText: string
    actionText: string
  }
  product: string
  judgementType: string
  extraFields?: {
    orderNo?: string
    partName?: string
    productCode?: string
    judgementForm?: string
    judgementClass?: string
  }
}

export type MonthlyStat = {
  monthKey: string
  totalCost: number
  totalCount: number
  categoryBreakdown: Record<
    string,
    {
      count: number
      cost: number
    }
  >
  judgementCountBreakdown: Record<string, number>
}

export type ProductCauseMonthlyStat = {
  monthKey: string
  product: string
  normalizedCause: string
  totalCost: number
  totalCount: number
  byJudgementType: Record<
    string,
    {
      count: number
      cost: number
    }
  >
}

export type MonthlyTotal = {
  monthKey: string
  totalCost: number
  monthlySales?: number
  judgementBreakdown?: Record<string, number>
  source: "detail" | "summarySheet"
}

export type MoMChange = {
  baseMonth: string
  targetMonth: string
  baseValue: number
  targetValue: number
  diff: number
  ratio: number
}

export type InsightHighlight = {
  monthKey: string
  product: string
  normalizedCause: string
  previousCount: number
  currentCount: number
}

export type JudgementChange = {
  judgementType: string
  baseMonth: string
  targetMonth: string
  baseValue: number
  targetValue: number
  diff: number
  ratio: number
}

export type ExecutiveReport = {
  summarySentences: string[]
  increasedProducts: InsightHighlight[]
  increasedCauses: InsightHighlight[]
  heavyDefectProducts: {
    monthKey: string
    product: string
    count: number
  }[]
  totalCostChanges: MoMChange[]
  judgementTypeChanges?: JudgementChange[]
  topProductCausePairs?: { product: string; cause: string; count: number }[]
  detailedBreakdown?: {
    judgementType: string
    products: {
      product: string
      count: number
      reasons: { cause: string; count: number }[]
    }[]
  }[]
  costItemChanges?: {
    item: string
    prevValue: number
    curValue: number
    diff: number
    ratio: number
  }[]
}

export type AnalysisSummary = {
  records: DefectRecord[]
  monthlyStats: MonthlyStat[]
  categories: string[]
  productCauseMonthlyStats: ProductCauseMonthlyStat[]
  monthlyTotals: MonthlyTotal[]
  executiveReport: ExecutiveReport | null
}
