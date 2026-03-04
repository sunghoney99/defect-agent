"use client"

import { useState, useRef, useEffect } from "react"
import { useAnalysis } from "@/context/analysis-context"

type CauseSelectProps = {
  value: string
  recordId: string
  variant?: "accent" | "red"
}

export function CauseSelect({ value, recordId, variant = "accent" }: CauseSelectProps) {
  const { causeOptions, updateRecordCause, addCustomKeyword } = useAnalysis()
  const [isCustomInput, setIsCustomInput] = useState(false)
  const [customValue, setCustomValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCustomInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCustomInput])

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value
    if (selected === "__custom__") {
      setIsCustomInput(true)
      setCustomValue("")
      return
    }
    updateRecordCause(recordId, selected)
  }

  const handleCustomSubmit = () => {
    const trimmed = customValue.trim()
    if (!trimmed) {
      setIsCustomInput(false)
      return
    }
    addCustomKeyword(trimmed)
    updateRecordCause(recordId, trimmed)
    setIsCustomInput(false)
    setCustomValue("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleCustomSubmit()
    } else if (e.key === "Escape") {
      setIsCustomInput(false)
    }
  }

  if (isCustomInput) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCustomSubmit}
          placeholder="새 키워드 입력..."
          className="text-xs font-bold text-slate-700 bg-white border border-accent rounded-lg px-2 py-1 w-36 outline-none focus:ring-1 focus:ring-accent/30"
        />
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={handleSelectChange}
      className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none cursor-pointer transition-colors"
    >
      {causeOptions.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
      <option value="__custom__">+ 새 키워드 추가</option>
    </select>
  )
}
