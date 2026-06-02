"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAnalysis } from "@/context/analysis-context"
import { buildAnalysisContext } from "@/lib/build-analysis-context"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Send, User, Sparkles, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"

type Message = {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_QUESTIONS = [
  "이번 달 가장 많이 발생한 결함 유형은 무엇인가요?",
  "전월 대비 하자보수비가 가장 많이 증가한 품목은?",
  "세트교환요구 건수가 많은 품목과 주요 원인을 알려주세요.",
  "고객불만 건수를 줄이기 위한 개선 방향을 제안해주세요.",
  "하자보수비 절감을 위한 우선순위 개선 품목은?",
]

export function AiChat() {
  const { summary, currentAnalysis } = useAnalysis()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isInsightLoading, setIsInsightLoading] = useState(false)
  const [insight, setInsight] = useState<string>("")
  const [isCollapsed, setIsCollapsed] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const targetMonthKey = currentAnalysis?.monthlyStats?.[currentAnalysis.monthlyStats.length - 1]?.monthKey

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const getContext = useCallback(() => {
    if (!summary || !targetMonthKey) return ""
    return buildAnalysisContext(summary, targetMonthKey)
  }, [summary, targetMonthKey])

  const streamResponse = useCallback(async (msgs: Message[]) => {
    const context = getContext()
    if (!context) return

    abortRef.current = new AbortController()
    setIsStreaming(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, analysisContext: context }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error("API 오류")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let assistantText = ""

      setMessages(prev => [...prev, { role: "assistant", content: "" }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        assistantText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "assistant", content: assistantText }
          return updated
        })
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => [...prev, { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." }])
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [getContext])

  // 자동 인사이트 생성
  const generateInsight = useCallback(async () => {
    const context = getContext()
    if (!context || isInsightLoading) return

    setIsInsightLoading(true)
    setInsight("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `위 데이터를 분석하여 이번 달 핵심 인사이트를 3~5가지 bullet point로 간결하게 요약해주세요. 각 항목은 구체적인 수치를 포함하고 실무 담당자가 바로 활용할 수 있는 내용이어야 합니다.` }],
          analysisContext: context,
        }),
      })

      if (!res.ok) throw new Error("API 오류")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setInsight(text)
      }
    } catch {
      setInsight("인사이트 생성에 실패했습니다.")
    } finally {
      setIsInsightLoading(false)
    }
  }, [getContext, isInsightLoading])

  // 분석 데이터가 로드되면 자동으로 인사이트 생성
  useEffect(() => {
    if (summary && targetMonthKey && !insight && !isInsightLoading) {
      generateInsight()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMonthKey])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    const userMsg: Message = { role: "user", content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")

    await streamResponse(newMessages)
  }, [messages, isStreaming, streamResponse])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (!summary || !targetMonthKey) return null

  return (
    <div className="space-y-4 mt-8">
      {/* AI 인사이트 카드 */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-violet-50/50 to-blue-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tighter">
              <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-violet-600" />
              </div>
              AI 핵심 인사이트
            </CardTitle>
            <button
              onClick={generateInsight}
              disabled={isInsightLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700 text-[11px] font-black uppercase transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isInsightLoading ? "animate-spin" : ""}`} />
              재생성
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {isInsightLoading && !insight ? (
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm font-medium">인사이트 분석 중...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap text-sm font-medium">
              {insight || "분석 데이터를 불러오는 중입니다."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 채팅 카드 */}
      <Card className="bg-white border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 rounded-[2.5rem]">
        <CardHeader
          className="border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-slate-50/50 cursor-pointer select-none"
          onClick={() => setIsCollapsed(v => !v)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-3 text-slate-800 uppercase tracking-tighter">
              <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              데이터 AI 질의응답
            </CardTitle>
            <div className="text-slate-400">
              {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </div>
          </div>
          {!isCollapsed && (
            <p className="text-sm text-slate-500 font-medium mt-1 pl-14">
              분석 데이터를 기반으로 궁금한 점을 자유롭게 질문하세요.
            </p>
          )}
        </CardHeader>

        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              key="chat-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <CardContent className="p-0">
                {/* 추천 질문 */}
                {messages.length === 0 && (
                  <div className="p-6 border-b border-slate-50">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">추천 질문</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_QUESTIONS.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          disabled={isStreaming}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all text-left"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 메시지 목록 */}
                <div className="h-[400px] overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                      >
                        {/* 아바타 */}
                        <div className={`w-8 h-8 rounded-2xl flex-shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-accent text-white" : "bg-violet-100 text-violet-600"}`}>
                          {msg.role === "user"
                            ? <User className="w-4 h-4" />
                            : <Bot className="w-4 h-4" />
                          }
                        </div>
                        {/* 말풍선 */}
                        <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed font-medium whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-accent text-white rounded-tr-sm"
                            : "bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm"
                        }`}>
                          {msg.content}
                          {msg.role === "assistant" && isStreaming && i === messages.length - 1 && (
                            <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse ml-1 rounded-full align-middle" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* 입력창 */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  {messages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(q)}
                          disabled={isStreaming}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-500 hover:border-accent/40 hover:text-accent transition-all"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 items-end">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="분석 데이터에 대해 궁금한 점을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
                      rows={2}
                      disabled={isStreaming}
                      className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 disabled:opacity-50 transition-all"
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={isStreaming || !input.trim()}
                      className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0 shadow-lg shadow-accent/30"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
