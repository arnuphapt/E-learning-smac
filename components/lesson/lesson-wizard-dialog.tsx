"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { BookOpenIcon, CheckIcon, ClipboardListIcon, FileTextIcon, FolderIcon, Loader2Icon, VideoIcon } from "lucide-react"
import { LoadingState } from "@/components/common/states"
import { ToneBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseDocs } from "@/components/lesson/types"
import { useLessonEditor } from "@/components/lesson/use-lesson-editor"
import { StepAssignments } from "./wizard/step-assignments"
import { StepBasics, type StepBasicsHandle } from "./wizard/step-basics"
import { StepDocs } from "./wizard/step-docs"
import { StepTest } from "./wizard/step-test"
import { StepVideo, type StepVideoHandle } from "./wizard/step-video"
import type { BasicsDraft } from "./wizard/wizard-types"

type ModalTab = "main" | "docs" | "test" | "assign"

/** Flexible lesson create/edit modal: single-page main form + optional tabs for docs, tests, and assignments. */
export function LessonWizardDialog({
  lessonId: initialLessonId,
  courseId,
  lessonsCount,
  onClose,
  onChanged,
}: {
  lessonId?: string | null
  courseId?: string | null
  lessonsCount?: number
  onClose: () => void
  onChanged?: () => void
}) {
  const [activeLessonId, setActiveLessonId] = useState<string | null>(initialLessonId ?? null)
  const [tab, setTab] = useState<ModalTab>("main")
  const [draftPatch, setDraftPatch] = useState<Partial<BasicsDraft>>({})
  const [busy, setBusy] = useState(false)

  const basicsRef = useRef<StepBasicsHandle | null>(null)
  const videoRef = useRef<StepVideoHandle | null>(null)

  const { lesson, course, data, loading, isTutor, saveState, markDirty, reload, saveDetails, createLesson } = useLessonEditor({
    lessonId: activeLessonId,
    onChanged,
  })

  const basicsDraft: BasicsDraft = {
    title: draftPatch.title ?? lesson?.title ?? "",
    description: draftPatch.description ?? lesson?.description ?? "",
    status: draftPatch.status ?? lesson?.status ?? "draft",
    has_docs: draftPatch.has_docs ?? lesson?.has_docs ?? true,
    has_pretest: draftPatch.has_pretest ?? lesson?.has_pretest ?? true,
    has_posttest: draftPatch.has_posttest ?? lesson?.has_posttest ?? true,
    has_assignment: draftPatch.has_assignment ?? lesson?.has_assignment ?? true,
    allow_ai: draftPatch.allow_ai ?? lesson?.allow_ai ?? true,
    watch_limit: draftPatch.watch_limit ?? lesson?.watch_limit ?? false,
  }

  const tabs = useMemo(() => {
    if (!lesson) return []
    const docsCount = parseDocs(lesson.documents).length
    const preCount = data.questions.filter((q) => q.kind === "pre").length
    const postCount = data.questions.filter((q) => q.kind === "post").length
    const testHint =
      lesson.has_pretest && lesson.has_posttest
        ? `${preCount}/${postCount}`
        : String(lesson.has_pretest ? preCount : postCount)

    const list: Array<{ key: ModalTab; label: string; icon: React.ReactNode; hint?: string }> = [
      { key: "main", label: "ข้อมูลหลักและวิดีโอ", icon: <VideoIcon /> },
    ]
    if (lesson.has_docs) {
      list.push({ key: "docs", label: "เอกสาร", icon: <FolderIcon />, hint: docsCount > 0 ? String(docsCount) : undefined })
    }
    if (!isTutor && (lesson.has_pretest || lesson.has_posttest)) {
      list.push({ key: "test", label: "แบบทดสอบ", icon: <ClipboardListIcon />, hint: testHint })
    }
    if (!isTutor && lesson.has_assignment) {
      list.push({ key: "assign", label: "ใบงาน", icon: <FileTextIcon />, hint: data.assignments.length > 0 ? String(data.assignments.length) : undefined })
    }
    return list
  }, [lesson, isTutor, data.questions, data.assignments.length])

  const activeTab: ModalTab = tabs.some((t) => t.key === tab) ? tab : "main"

  const flushMain = async () => {
    if (activeTab !== "main") return true
    const ok = basicsRef.current ? await basicsRef.current.flushPending() : true
    if (!ok) return false
    if (videoRef.current) await videoRef.current.flushPending()
    return true
  }

  const handleTabChange = async (next: string) => {
    const nextTab = next as ModalTab
    if (nextTab === activeTab || busy || !lesson) return
    setBusy(true)
    try {
      const ok = await flushMain()
      if (!ok) return
      setTab(nextTab)
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async () => {
    if (busy) return
    setBusy(true)
    try {
      const ok = await basicsRef.current?.flushPending()
      if (!ok) return
      if (!courseId) {
        toast.error("ไม่พบรหัสรายวิชา")
        return
      }
      const newId = await createLesson({
        courseId,
        title: basicsDraft.title.trim(),
        description: basicsDraft.description,
        status: basicsDraft.status,
        lessonsCount,
        has_docs: basicsDraft.has_docs,
        has_pretest: basicsDraft.has_pretest,
        has_posttest: basicsDraft.has_posttest,
        has_assignment: basicsDraft.has_assignment,
        allow_ai: basicsDraft.allow_ai,
        watch_limit: basicsDraft.watch_limit,
      })
      if (newId) {
        setDraftPatch({})
        setActiveLessonId(newId)
        setTab("main")
      }
    } finally {
      setBusy(false)
    }
  }

  const handleDone = async () => {
    if (busy) return
    setBusy(true)
    try {
      const ok = await flushMain()
      if (!ok) return
      onChanged?.()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const saveLabel =
    saveState.status === "saving"
      ? "กำลังบันทึก…"
      : saveState.status === "dirty"
        ? "มีการแก้ไขที่ยังไม่บันทึก"
        : saveState.status === "saved" && saveState.savedAt
          ? `บันทึกแล้ว ${saveState.savedAt}`
          : lesson
            ? "พร้อมแก้ไข"
            : "กรอกข้อมูลเพื่อสร้างบทเรียน"

  const headerTitle = lesson ? lesson.title || "แก้ไขบทเรียน" : "สร้างบทเรียนใหม่"
  const headerDesc = course?.code ? `${course.code}${lesson ? ` · บทที่ ${lesson.index}` : ""}` : "กรอกข้อมูลและจัดการเนื้อหาบทเรียน"

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border/80 bg-card px-6 py-4 pr-14 text-left">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {lesson ? (
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-semibold tabular-nums text-primary-soft-foreground">
                  {String(lesson.index).padStart(2, "0")}
                </div>
              ) : (
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <BookOpenIcon className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base font-semibold tracking-tight">{headerTitle}</DialogTitle>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <DialogDescription className={course?.code ? "font-mono text-xs text-muted-foreground" : "text-xs text-muted-foreground"}>
                    {headerDesc}
                  </DialogDescription>
                  {lesson && (
                    <ToneBadge tone={lesson.status === "active" ? "success" : "muted"}>
                      {lesson.status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                    </ToneBadge>
                  )}
                </div>
              </div>
            </div>
            {lesson && isTutor && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/i/lesson/${lesson.id}/bank`}>
                  <ClipboardListIcon />
                  คลังข้อสอบ
                </Link>
              </Button>
            )}
          </div>
        </DialogHeader>

        {lesson && tabs.length > 1 && (
          <div className="shrink-0 overflow-x-auto border-b border-border/80 bg-muted/30 px-6">
            <Tabs value={activeTab} onValueChange={(v) => void handleTabChange(v)}>
              <TabsList variant="line" className="h-11 gap-2 p-0">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.key}
                    value={t.key}
                    className="h-11 rounded-none px-3 text-sm after:bottom-0 after:bg-primary data-[state=active]:text-primary"
                  >
                    {t.icon}
                    <span>{t.label}</span>
                    {t.hint && (
                      <span className="ml-1 rounded-full border border-border/80 bg-card px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                        {t.hint}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="modal-scroll flex-1 overflow-y-auto bg-card px-6 py-5">
          {loading ? (
            <LoadingState className="min-h-60" />
          ) : (
            <>
              {activeTab === "main" && (
                <div className="grid gap-6">
                  <StepBasics
                    ref={basicsRef}
                    lesson={lesson}
                    isTutor={isTutor}
                    draft={basicsDraft}
                    onDraftChange={(patch) => setDraftPatch((p) => ({ ...p, ...patch }))}
                    onSave={async (fields, silent) => {
                      await saveDetails(fields, silent)
                      setDraftPatch((p) => {
                        const next = { ...p }
                        for (const k of Object.keys(fields) as Array<keyof BasicsDraft>) {
                          delete next[k]
                        }
                        return next
                      })
                    }}
                    onMarkDirty={markDirty}
                  />
                  {lesson && (
                    <>
                      <Separator />
                      <StepVideo ref={videoRef} lesson={lesson} onSave={saveDetails} onMarkDirty={markDirty} />
                    </>
                  )}
                </div>
              )}

              {lesson && lesson.has_docs && activeTab === "docs" && <StepDocs lesson={lesson} onSave={saveDetails} />}

              {lesson && !isTutor && (lesson.has_pretest || lesson.has_posttest) && activeTab === "test" && (
                <StepTest lesson={lesson} questions={data.questions} onLoad={reload} onSaveSettings={saveDetails} />
              )}

              {lesson && !isTutor && lesson.has_assignment && activeTab === "assign" && (
                <StepAssignments
                  lesson={lesson}
                  assignments={data.assignments}
                  rubrics={data.rubrics}
                  onReload={reload}
                />
              )}
            </>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/80 bg-muted/35 px-6 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
            {saveState.status === "saving" ? (
              <Loader2Icon className="size-3.5 animate-spin text-primary" />
            ) : saveState.status === "dirty" ? (
              <span aria-hidden className="size-2 rounded-full bg-warning" />
            ) : saveState.status === "saved" ? (
              <span aria-hidden className="size-2 rounded-full bg-success" />
            ) : (
              <span aria-hidden className="size-2 rounded-full bg-muted-foreground/40" />
            )}
            <span>{saveLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {!lesson ? (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                  ยกเลิก
                </Button>
                <Button type="button" onClick={() => void handleCreate()} disabled={busy || loading}>
                  {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                  สร้างบทเรียน
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => void handleDone()} disabled={busy || loading}>
                {busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                เสร็จสิ้น
              </Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
