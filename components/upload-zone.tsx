"use client"

import {
  ChangeEvent,
  DragEvent,
  useCallback,
  useState
} from "react"
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react"
import { useAnalysis } from "@/context/analysis-context"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"

export function UploadZone() {
  const { analyze, isAnalyzing, error } = useAnalysis()
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return
      setFileName(file.name)
      await analyze(file)
    },
    [analyze]
  )

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    void handleFile(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0] ?? null
    void handleFile(file)
  }

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }

  return (
    <Card className="border-dashed border-slate-700 bg-slate-900/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-accent" />
          엑셀 파일 업로드
        </CardTitle>
        {fileName && (
          <span className="text-xs text-muted-foreground">{fileName}</span>
        )}
      </CardHeader>
      <CardContent>
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={
            "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-700 px-6 py-10 text-center transition-colors " +
            (isDragging ? "border-accent bg-slate-900" : "bg-slate-950/40")
          }
        >
          {isAnalyzing ? (
            <Loader2 className="h-7 w-7 animate-spin text-accent" />
          ) : (
            <Upload className="h-7 w-7 text-accent" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">
              엑셀 파일을 여기로 드래그하거나 클릭해서 선택하세요.
            </p>
            <p className="text-xs text-muted-foreground">
              .xlsx 형식의 결함 유지보수 비용 데이터를 분석합니다.
            </p>
          </div>
          <div className="mt-2">
            <label>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={onInputChange}
              />
              <Button type="button" size="md" variant="outline">
                파일 선택
              </Button>
            </label>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

