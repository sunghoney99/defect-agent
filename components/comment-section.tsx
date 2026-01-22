"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { MessageSquare, Send, User, Building2, Trash2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"

interface CommentSectionProps {
  monthKey: string
}

export function CommentSection({ monthKey }: CommentSectionProps) {
  const comments = useQuery(api.comments.listByMonth, { monthKey })
  const createComment = useMutation(api.comments.create)
  const removeComment = useMutation(api.comments.remove)

  const [name, setName] = useState("")
  const [team, setTeam] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !team.trim() || !content.trim()) return

    setIsSubmitting(true)
    try {
      await createComment({
        monthKey,
        name: name.trim(),
        team: team.trim(),
        content: content.trim(),
      })
      setName("")
      setTeam("")
      setContent("")
    } catch (error) {
      console.error("Failed to create comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: any) => {
    if (confirm("이 코멘트를 삭제하시겠습니까?")) {
      await removeComment({ id })
    }
  }

  return (
    <div className="mt-6 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-200/60 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">코멘트</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Comments & Feedback</p>
        </div>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="소속팀"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <textarea
            placeholder="의견이나 코멘트를 작성해주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all resize-none"
          />
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !team.trim() || !content.trim()}
            className="px-4 py-3 rounded-xl bg-accent text-white font-bold text-sm hover:bg-accent/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 self-end"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">등록</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {comments && comments.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center"
            >
              <p className="text-xs text-slate-400 font-bold">아직 등록된 코멘트가 없습니다.</p>
            </motion.div>
          )}
          {comments?.map((comment) => (
            <motion.div
              key={comment._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-black text-slate-800">{comment.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[10px] font-bold uppercase">
                      {comment.team}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {format(new Date(comment.createdAt), "MM.dd HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
                <button
                  onClick={() => handleDelete(comment._id)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
