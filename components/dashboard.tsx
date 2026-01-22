"use client"

import { useMemo } from "react"
import {
  Bar,
  Line,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  CartesianGrid
} from "recharts"
import { useAnalysis } from "@/context/analysis-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { motion } from "framer-motion"
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react"

export function Dashboard() {
  const { summary } = useAnalysis()

  const chartData = useMemo(() => {
    if (!summary) return []

    // Merge monthlyTotals (official sums) with monthlyStats (counts/breakdowns)
    return summary.monthlyStats.map(stat => {
      const officialTotal = summary.monthlyTotals.find(t => t.monthKey === stat.monthKey)
      return {
        ...stat,
        // Prefer official total cost from summary sheet if available
        totalCost: officialTotal ? officialTotal.totalCost : stat.totalCost,
        setExchangeCount: stat.judgementCountBreakdown?.["세트교환요구"] || 0,
        complaintCount: stat.judgementCountBreakdown?.["고객불만"] || 0
      }
    })
  }, [summary])

  if (!summary || chartData.length === 0) return null

  const latestStat = chartData[chartData.length - 1]

  return (
    <div className="space-y-8">
      <Card className="bg-white border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 rounded-[3rem]">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-8 pb-6">
          <CardTitle className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Monthly Defect Trend</CardTitle>
          <CardDescription className="text-slate-500 font-medium text-base">
            최근 수집된 세트교환/고객불만 건수 및 전체 하자보수 비용 추이입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="colorSet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorComplaint" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="monthKey"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }}
                  dy={15}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }}
                  label={{ value: '건수', angle: -90, position: 'insideLeft', offset: 0, fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 700 }}
                  label={{ value: '비용 (원)', angle: 90, position: 'insideRight', offset: 0, fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '24px',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(8px)',
                    padding: '16px'
                  }}
                  itemStyle={{ fontWeight: 800, fontSize: '13px' }}
                  labelStyle={{ color: '#64748b', fontWeight: 900, marginBottom: '8px', fontSize: '14px', textTransform: 'uppercase' }}
                  formatter={(value: any, name: string) => {
                    if (name.includes("비용")) return [`${Math.round(value).toLocaleString()}원`, name];
                    return [`${value}건`, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '30px', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="setExchangeCount"
                  name="세트교환 건수"
                  fill="url(#colorSet)"
                  radius={[8, 8, 0, 0]}
                  barSize={30}
                />
                <Bar
                  yAxisId="left"
                  dataKey="complaintCount"
                  name="고객불만 건수"
                  fill="url(#colorComplaint)"
                  radius={[8, 8, 0, 0]}
                  barSize={30}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalCost"
                  name="전체 하자보수 비용"
                  stroke="#10b981"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#ffffff' }}
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }}
                  connectNulls
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
