"use client"

import { useAnalysis } from "@/context/analysis-context"

const JUDGEMENT_TYPE_OPTIONS = ["세트교환요구", "고객불만", "R&D", "사양재검토", "영업지원"]

type JudgementTypeSelectProps = {
  value: string
  recordId: string
}

export function JudgementTypeSelect({ value, recordId }: JudgementTypeSelectProps) {
  const { updateRecordJudgementType } = useAnalysis()

  return (
    <select
      value={value || ""}
      onChange={(e) => {
        if (e.target.value && e.target.value !== value) {
          updateRecordJudgementType(recordId, e.target.value)
        }
      }}
      className="text-xs font-bold bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 hover:border-amber-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-300 outline-none cursor-pointer transition-colors text-amber-800"
    >
      {JUDGEMENT_TYPE_OPTIONS.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
      {value && !JUDGEMENT_TYPE_OPTIONS.includes(value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  )
}
