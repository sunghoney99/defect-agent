import type { Metadata } from "next"
import "./globals.css"
import { ConvexClientProvider } from "@/components/convex-provider"

export const metadata: Metadata = {
  title: "데스커 하자보수비 AI 분석 시스템",
  description: "Excel 기반 데스커 하자보수비 분석 대시보드"
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ConvexClientProvider>{props.children}</ConvexClientProvider>
      </body>
    </html>
  )
}

