"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { LockIcon, MenuIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { AiChat } from "@/components/ai/ai-chat"
import { EmptyState, LoadingState } from "@/components/common/states"
import { lessonDocsOf } from "./chat-utils"
import { AiSidebar } from "./ai-sidebar"
import { AiTopBar } from "./ai-top-bar"
import { AiWelcome } from "./ai-welcome"
import { useAiChat } from "./use-ai-chat"
import { useAiCourses } from "./use-ai-courses"
import { useAiHealth } from "./use-ai-health"

/** /s/ai: lesson picker + history column, and the chat for the selected lesson. Fills the shell's content column. */
export function AiAssistant() {
  const { data: session } = useSession()
  const studentName = session?.user?.name || "เพื่อนนักศึกษา"
  const [menuOpen, setMenuOpen] = useState(false)

  const courses = useAiCourses()
  const { selectedLesson } = courses
  const health = useAiHealth()
  const chat = useAiChat({ selectedLesson, selectedCourse: courses.selectedCourse })

  if (courses.loading) return <LoadingState className="h-full" />

  const sidebar = (afterSelect?: () => void) => (
    <AiSidebar
      courses={courses.courses}
      selectedCourseId={courses.selectedCourseId}
      onCourseChange={courses.changeCourse}
      lessons={courses.lessonsForSelectedCourse}
      selectedLessonId={courses.selectedLessonId}
      onLessonChange={courses.setSelectedLessonId}
      sessions={chat.sessionHistory}
      activeSessionId={chat.activeSessionId}
      onNewChat={chat.startNewSession}
      onSelectSession={(s) => {
        chat.selectSession(s)
        afterSelect?.()
      }}
      onDeleteSession={chat.deleteSession}
      aiStatus={health.status}
      aiStatusReason={health.reason}
      onCheckHealth={health.check}
      emotion={health.status === "offline" ? "sleeping" : chat.apiLoading ? "thinking" : chat.currentEmotion}
    />
  )

  const openMenu = (
    <Button type="button" variant="outline" onClick={() => setMenuOpen(true)} className="lg:hidden">
      <MenuIcon />
      เลือกรายวิชาและบทเรียน
    </Button>
  )

  return (
    <div className="flex h-full min-h-0 w-full">
      <h1 className="sr-only">AI ผู้ช่วย</h1>
      <aside className="hidden w-70 shrink-0 border-r lg:block">{sidebar()}</aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-70 p-0 sm:max-w-70">
          <SheetTitle className="sr-only">รายวิชา บทเรียน และประวัติการสนทนา</SheetTitle>
          <SheetDescription className="sr-only">เลือกรายวิชาและบทเรียนที่ต้องการคุยกับ AI</SheetDescription>
          <div className="h-full pt-10">{sidebar(() => setMenuOpen(false))}</div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AiTopBar
          lesson={selectedLesson}
          onOpenMenu={() => setMenuOpen(true)}
          onSummarize={() => chat.sendMessage("", "summarize")}
          summarizeDisabled={chat.apiLoading || chat.summarizing}
          summarizing={chat.summarizing}
          rateLimitInfo={chat.rateLimitInfo}
        />

        {!selectedLesson ? (
          <EmptyState
            className="flex-1"
            icon={<SparklesIcon />}
            title="ยินดีต้อนรับสู่ AI ผู้ช่วยเรียนรู้"
            description="เปิดเมนูข้างเพื่อเลือกรายวิชาและบทเรียน เพื่อเริ่มการสนทนาหรือขอสรุปเนื้อหาจาก AI ติวเตอร์"
            action={openMenu}
          />
        ) : selectedLesson.allow_ai === false ? (
          <EmptyState
            className="flex-1"
            icon={<LockIcon />}
            title="บทเรียนนี้ไม่อนุญาตให้ใช้ AI"
            description="อาจารย์ผู้สอนยังไม่ได้เปิดใช้งาน AI สำหรับบทเรียนนี้ นักศึกษาสามารถทบทวนบทเรียนผ่านเอกสารและวิดีโอประกอบการสอนตามปกติ"
          />
        ) : (
          <AiChat
            messages={chat.messages}
            welcome={
              <AiWelcome
                studentName={studentName}
                lesson={selectedLesson}
                disabled={chat.apiLoading}
                onPrompt={(p) => chat.sendMessage(p)}
              />
            }
            thinking={chat.apiLoading && !chat.summarizing}
            input={chat.input}
            onInputChange={chat.setInput}
            onSend={() => chat.sendMessage(chat.input)}
            loading={chat.apiLoading}
            rateLimitInfo={chat.rateLimitInfo}
            rateLimitError={chat.rateLimitError}
            sessionTokenError={chat.sessionTokenError}
            onRestart={chat.restartAfterTokenLimit}
            lessonDocs={lessonDocsOf(selectedLesson)}
            attachedFiles={chat.attachedFiles}
            onAttachedChange={chat.setAttachedFiles}
          />
        )}
      </div>
    </div>
  )
}
