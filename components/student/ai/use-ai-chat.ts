"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useConfirm } from "@/components/common/confirm"
import { defaultGreeting, newSessionId, parseEmotionAndReply, sessionToMessages } from "./chat-utils"
import type { AiLogRow, ChatMessage, ChatSession, CourseRow, LessonDoc, RateLimitInfo, StudentLessonRow } from "./types"

const SUMMARY_LABEL = "ขอสรุปเนื้อหาบทเรียนนี้"

async function loadGreeting(lessonTitle: string | undefined) {
  let greeting = defaultGreeting(lessonTitle)
  try {
    const pRes = await fetch("/api/ai/persona")
    if (pRes.ok) {
      const pData = (await pRes.json()) as { greetingTemplate?: string }
      if (pData.greetingTemplate) {
        greeting = parseEmotionAndReply(pData.greetingTemplate.replace(/{lesson_title}/g, lessonTitle || "บทเรียนนี้")).cleanText
      }
    }
  } catch (e: unknown) {
    console.error("Failed to load persona greeting:", e)
  }
  return greeting
}

function errorText(err: unknown) {
  const errStr = err instanceof Error ? String(err.message || "") : String(err || "")
  if (errStr === "rate_limit_exceeded") return "ขออภัย คุณถามคำถามเกินขีดจำกัด 15 คำถามในรอบ 5 ชั่วโมงแล้ว สามารถถามได้อีกครั้งในรอบถัดไป"
  if (errStr === "session_token_limit") return "เซสชันนี้มีขนาดประวัติการสนทนาเกินขีดจำกัดแล้ว กรุณาเริ่มการสนทนาใหม่เพื่อคุยต่อ"
  if (errStr === "Cannot answer the question") return "ขออภัย ไม่สามารถตอบได้ในขณะนี้"
  if (errStr.includes("429") || errStr.includes("quota")) return "ขออภัย เกิดข้อผิดพลาดระบบโควต้าการใช้งาน AI เต็ม กรุณาลองใหม่อีกครั้งในภายหลัง"
  return "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง"
}

/** One lesson's AI conversation: sessions (history), quota, sending, and the avatar emotion. */
export function useAiChat({
  selectedLesson,
  selectedCourse,
}: {
  selectedLesson?: StudentLessonRow
  selectedCourse?: CourseRow
}) {
  const { data: session } = useSession()
  const studentId = session?.dbId || session?.user?.id
  const confirm = useConfirm()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [apiLoading, setApiLoading] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<LessonDoc[]>([])
  const [currentEmotion, setCurrentEmotion] = useState("idle")
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [sessionHistory, setSessionHistory] = useState<ChatSession[]>([])
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [rateLimitError, setRateLimitError] = useState(false)
  const [sessionTokenError, setSessionTokenError] = useState(false)
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const changeEmotion = (newEmotion: string) => {
    setCurrentEmotion(newEmotion)
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current)
    if (newEmotion !== "idle") emotionTimerRef.current = setTimeout(() => setCurrentEmotion("idle"), 5000)
  }

  useEffect(() => {
    return () => {
      if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current)
    }
  }, [])

  const loadHistoryAndSession = async (lessonId: string, lessonTitle: string) => {
    if (!studentId || !lessonId) return
    setApiLoading(true)
    try {
      const greeting = await loadGreeting(lessonTitle)

      const { data: logs, error } = await supabase
        .from("ai_chat_logs")
        .select("*")
        .eq("student_id", studentId)
        .eq("lesson_id", lessonId)
        .eq("hidden_by_student", false)
        .neq("reply", "") // quota claims (api/ai/chat, tutor explain) are empty placeholder rows until the reply is filled
        .order("created_at", { ascending: true })
      if (error) throw error

      if (logs && logs.length > 0) {
        const groups: Record<string, AiLogRow[]> = {}
        logs.forEach((log) => {
          const sId = log.session_id || "legacy"
          ;(groups[sId] ??= []).push(log)
        })
        const sessions: ChatSession[] = Object.keys(groups).map((sId) => {
          const sLogs = groups[sId]
          return {
            id: sId,
            createdAt: sLogs[0].created_at,
            updatedAt: sLogs[sLogs.length - 1].created_at,
            firstQuestion: sLogs[0].message,
            logs: sLogs,
          }
        })
        // latest first
        sessions.sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime())
        setSessionHistory(sessions)
        setActiveSessionId(sessions[0].id)
        setMessages(sessionToMessages(greeting, sessions[0]))
      } else {
        setActiveSessionId(newSessionId())
        setSessionHistory([])
        setMessages([{ role: "assistant", content: greeting }])
      }
    } catch (err: unknown) {
      console.error("Failed to load chat history:", err)
    } finally {
      setApiLoading(false)
    }
  }

  const fetchQuotaUsage = async (studId: string) => {
    try {
      let limit = 15
      const { data: settingsData } = await supabase.from("ai_settings").select("key, value")
      const limitRow = settingsData?.find((r) => r.key === "daily_chat_limit")
      if (limitRow) limit = parseInt(limitRow.value ?? "", 10) || 15

      const windowStart = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from("ai_chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studId)
        .in("mode", ["chat", "summarize", "explain"])
        .neq("reply", "")
        .gte("created_at", windowStart)

      if (!error) {
        const used = count || 0
        setRateLimitInfo({ used, limit })
        setRateLimitError(used >= limit)
      }
    } catch (err: unknown) {
      console.error("Failed to fetch quota usage:", err)
    }
  }

  useEffect(() => {
    if (selectedLesson && studentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetches the chat for the chosen lesson; the loading flag has to flip first
      loadHistoryAndSession(selectedLesson.id, selectedLesson.title)
      fetchQuotaUsage(studentId)
      setSessionTokenError(false)
    } else {
      setMessages([])
      changeEmotion("idle")
    }
    setInput("")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the lesson or user changes (same as before)
  }, [selectedLesson?.id, studentId])

  const startNewSession = async () => {
    setActiveSessionId(newSessionId())
    const greeting = await loadGreeting(selectedLesson?.title)
    setMessages([{ role: "assistant", content: greeting }])
    changeEmotion("idle")
  }

  const selectSession = (sess: ChatSession) => {
    setActiveSessionId(sess.id)
    setMessages(sessionToMessages(defaultGreeting(selectedLesson?.title), sess))
  }

  const deleteSession = async (sessId: string) => {
    const ok = await confirm({
      danger: true,
      title: "ยืนยันการลบประวัติการสนทนา",
      message: "คุณต้องการลบประวัติการสนทนาของเซสชันนี้ใช่หรือไม่?",
      confirmText: "ลบข้อมูล",
      cancelText: "ยกเลิก",
    })
    if (!ok) return
    try {
      const res = await fetch("/api/ai/history/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessId }),
      })
      if (!res.ok) throw new Error(`clear failed: ${res.status}`)
      if (activeSessionId === sessId) startNewSession()
      if (selectedLesson) loadHistoryAndSession(selectedLesson.id, selectedLesson.title)
      toast.success("ลบประวัติการสนทนาเรียบร้อยแล้ว")
    } catch (err: unknown) {
      console.error("Failed to delete session:", err)
      toast.error("ไม่สามารถลบเซสชันได้ กรุณาลองใหม่อีกครั้ง")
    }
  }

  const sendMessage = async (userText: string, mode: "chat" | "summarize" = "chat") => {
    if (!selectedLesson) return

    let finalUserText = userText
    const currentAttachments = mode === "chat" ? attachedFiles : []

    if (!finalUserText.trim() && mode !== "summarize") {
      if (currentAttachments.length > 0) {
        finalUserText = "ช่วยอธิบายเนื้อหาหรือตอบคำถามจากเอกสารประกอบการเรียนที่แนบมานี้ให้หน่อยครับ/ค่ะ"
      } else {
        return
      }
    }

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: finalUserText, attachments: currentAttachments }]

    if (mode === "chat") {
      setMessages(newMessages)
      setInput("")
      setAttachedFiles([])
    } else {
      setSummarizing(true)
    }
    setApiLoading(true)

    const lessonContext = {
      id: selectedLesson.id,
      courseId: selectedCourse?.id || selectedLesson.course_id,
      title: selectedLesson.title,
      index: selectedLesson.index,
      courseCode: selectedCourse?.code,
      courseName: selectedCourse?.title,
      description: selectedLesson.description,
      duration: selectedLesson.duration,
    }
    // summarize replaces the pending question with a fixed label
    const finish = (reply: string) =>
      mode === "summarize"
        ? setMessages([...messages, { role: "user", content: SUMMARY_LABEL }, { role: "assistant", content: reply }])
        : setMessages([...newMessages, { role: "assistant", content: reply }])

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          lessonContext,
          mode,
          studentId: studentId || session?.user?.id,
          attachments: currentAttachments,
          sessionId: activeSessionId,
        }),
      })

      const data = (await res.json()) as {
        error?: string
        used?: number
        limit?: number
        reply?: string
        rateLimitInfo?: RateLimitInfo
      }
      if (!res.ok || data.error) {
        if (data.error === "rate_limit_exceeded") {
          setRateLimitError(true)
          if (data.used !== undefined && data.limit !== undefined) setRateLimitInfo({ used: data.used, limit: data.limit })
          throw new Error("rate_limit_exceeded")
        }
        if (data.error === "session_token_limit") {
          setSessionTokenError(true)
          throw new Error("session_token_limit")
        }
        throw new Error(data.error || "Failed to get AI response")
      }
      if (!data.reply) throw new Error("Cannot answer the question")

      const { emotion, cleanText } = parseEmotionAndReply(data.reply)
      changeEmotion(emotion)
      if (data.rateLimitInfo) {
        setRateLimitInfo(data.rateLimitInfo)
        if (data.rateLimitInfo.used >= data.rateLimitInfo.limit) setRateLimitError(true)
      }
      finish(cleanText)
    } catch (err: unknown) {
      console.error("AI Error:", err)
      changeEmotion("sad")
      finish(errorText(err))
    }
    if (mode === "summarize") setSummarizing(false)
    setApiLoading(false)
  }

  const restartAfterTokenLimit = () => {
    setSessionTokenError(false)
    startNewSession()
  }

  return {
    messages,
    input,
    setInput,
    apiLoading,
    summarizing,
    attachedFiles,
    setAttachedFiles,
    currentEmotion,
    activeSessionId,
    sessionHistory,
    rateLimitInfo,
    rateLimitError,
    sessionTokenError,
    sendMessage,
    startNewSession,
    selectSession,
    deleteSession,
    restartAfterTokenLimit,
  }
}
