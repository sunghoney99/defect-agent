import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Defect Maintenance Cost Agent",
  description: "Excel 기반 결함 유지보수 비용 분석 대시보드"
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{props.children}</body>
    </html>
  )
}

