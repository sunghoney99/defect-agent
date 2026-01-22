import { AnalysisProvider } from "@/context/analysis-context"
import DatabaseList from "@/components/database-list"
import { AnalysisResults } from "@/components/analysis-results"
import { NewAnalysisZone } from "@/components/new-analysis-zone"

export default function HomePage() {
  return (
    <AnalysisProvider>
      <main className="flex min-h-screen flex-col gap-6 px-4 py-6 text-slate-900 md:px-8 md:py-10">
        <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between px-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest border border-accent/20">Alpha v0.2</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl text-slate-900">
              하자보수비 AI 분석 시스템
            </h1>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl font-medium">
              신규 데이터를 업로드하여 AI 분석 리포트를 생성하고, 과거 데이터를 체계적으로 관리하세요.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[420px_1fr] mt-4">
          <div className="space-y-8">
            <NewAnalysisZone />
            <DatabaseList />
          </div>
          <div>
            <AnalysisResults />
          </div>
        </section>
      </main>
    </AnalysisProvider>
  )
}
