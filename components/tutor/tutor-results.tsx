"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertCircleIcon, BarChart3Icon, DownloadIcon, FileSpreadsheetIcon, UsersIcon } from "lucide-react"
import {
  summarizeLesson,
  exportRows,
  domainCounts,
  filterByDomain,
  type LessonSummary,
  type StudentLessonSummary,
} from "@/lib/tutor-results"
import { DataTable } from "@/components/common/data-table"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { loadAttempts, loadUsers, type TutorUserEntry, type LoadedAttemptRow } from "./results-data"
import { ResultsOverview } from "./results-overview"
import { studentResultColumns } from "./results-student-columns"
import { StudentRounds } from "./student-rounds"
import { TopicBars } from "./topic-bars"
import { loadXlsx } from "./xlsx"

interface TutorResultsLesson {
  id: string
  index?: number | null
  title?: string | null
}

interface TutorResultsData {
  attempts: LoadedAttemptRow[]
  users: Map<string, TutorUserEntry>
}

const EMPTY_USERS = new Map<string, TutorUserEntry>()
const ALL_DOMAINS = "__all__" // ToggleGroup / Select cannot hold ""

// Third tab of the instructor workspace: how the set's students did. Only ENDED rounds are scored (submitted / expired with a
// stored result); a running round is only counted. Students who never attempted are not listed (see the note in the overview).
export function TutorResults({ course, lessons }: { course: { code?: string | null }; lessons: readonly TutorResultsLesson[] }) {
  const [data, setData] = useState<TutorResultsData | null>(null)
  const [failed, setFailed] = useState(false)
  const [lessonId, setLessonId] = useState(lessons[0]?.id || "")
  const [open, setOpen] = useState<StudentLessonSummary | null>(null) // student summary entry shown in the side panel
  const [exporting, setExporting] = useState(false)
  const [domain, setDomain] = useState("") // "" = ทุกโดเมน; kept across lesson switches

  const ids = lessons.map((l) => l.id).join("|")
  useEffect(() => {
    if (!ids) return
    let cancelled = false
    ;(async () => {
      const attempts = await loadAttempts(ids.split("|"))
      const users = await loadUsers([...new Set(attempts.map((a) => a.student_id))])
      if (!cancelled) setData({ attempts, users })
    })().catch((e: unknown) => {
      if (!cancelled) {
        setFailed(true)
        toast.error("โหลดผลการทำข้อสอบไม่สำเร็จ: " + (e instanceof Error ? e.message : String(e)))
      }
    })
    return () => {
      cancelled = true
    }
  }, [ids])

  const summaries = useMemo(() => {
    const m = new Map<string, LessonSummary>()
    const users = data?.users || EMPTY_USERS
    for (const l of lessons) m.set(l.id, summarizeLesson(filterByDomain((data?.attempts || []).filter((a) => a.lesson_id === l.id), users, domain)))
    return m
  }, [data, lessons, domain])
  const columns = useMemo(() => studentResultColumns(data?.users || EMPTY_USERS, setOpen), [data])

  if (failed) return <ErrorState title="โหลดผลการทำข้อสอบไม่สำเร็จ" description="ลองเปิดแท็บนี้อีกครั้ง" />
  if (lessons.length === 0) {
    return <EmptyState icon={<BarChart3Icon />} title="ยังไม่มีบทเรียน" description="เพิ่มบทเรียนและคลังข้อสอบก่อน แล้วผลของนักศึกษาจะแสดงที่นี่" />
  }
  if (!data) return <LoadingState />

  const lesson = lessons.find((l) => l.id === lessonId) || lessons[0]
  const s = summaries.get(lesson.id)!
  const lessonAttempts = data.attempts.filter((a) => a.lesson_id === lesson.id)
  const domains = domainCounts(data.users)
  const anyResult = [...summaries.values()].some((x) => x.students.length > 0)
  const domainTabs: Array<[string, string, number]> = [
    [ALL_DOMAINS, "ทุกโดเมน", data.users.size],
    ...domains.map(([d, n]): [string, string, number] => [d, d, n]),
  ]

  const exportXlsx = async (only: TutorResultsLesson | null) => {
    setExporting(true)
    try {
      const XLSX = await loadXlsx()
      const wb = XLSX.utils.book_new()
      for (const l of only ? [only] : lessons) {
        const sum = summaries.get(l.id)!
        if (!sum.students.length) continue
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRows(sum, data.users)), "บทที่ " + l.index)
      }
      if (!wb.SheetNames.length) {
        toast.error("ยังไม่มีผลที่ส่งออกได้")
        return
      }
      XLSX.writeFile(wb, `ผลติว_${course.code}${only ? "_บทที่_" + only.index : ""}${domain ? "_" + domain : ""}.xlsx`)
      toast.success("ส่งออกไฟล์ผลการทำข้อสอบสำเร็จ")
    } catch (e: unknown) {
      toast.error("ส่งออกไม่สำเร็จ: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid min-w-[min(100%,360px)] gap-1.5">
          <Label htmlFor="tw-res-lesson">บทเรียน</Label>
          <Select
            value={lesson.id}
            onValueChange={(v) => {
              setLessonId(v)
              setOpen(null)
            }}
          >
            <SelectTrigger id="tw-res-lesson" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lessons.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {String(l.index ?? "").padStart(2, "0")} · {l.title || "(ไม่มีชื่อบทเรียน)"} ({summaries.get(l.id)!.students.length} คน)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={exporting || !s.students.length} onClick={() => exportXlsx(lesson)}>
            <DownloadIcon />
            ส่งออกบทนี้
          </Button>
          <Button variant="outline" size="sm" disabled={exporting || !anyResult} onClick={() => exportXlsx(null)}>
            <FileSpreadsheetIcon />
            ส่งออกทั้งชุด
          </Button>
        </div>
      </div>

      {domains.length > 1 && (
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="กรองตามโดเมน"
          className="flex-wrap"
          value={domain || ALL_DOMAINS}
          onValueChange={(v) => {
            if (!v) return
            setDomain(v === ALL_DOMAINS ? "" : v)
            setOpen(null)
          }}
        >
          {domainTabs.map(([d, label, n]) => (
            <ToggleGroupItem key={d} value={d}>
              {label} ({n})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      <ResultsOverview s={s} />

      {s.students.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<UsersIcon />}
              title="ยังไม่มีนักศึกษาที่ทำข้อสอบบทนี้เสร็จ"
              description={s.inProgress > 0 ? `มี ${s.inProgress} รอบที่กำลังทำอยู่ ผลจะแสดงเมื่อส่งหรือหมดเวลา` : "เมื่อนักศึกษาส่งรอบแรก ผลจะแสดงที่นี่"}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>หัวข้อของทั้งชั้น</CardTitle>
              <CardDescription>รวมคำตอบถูกต่อทั้งหมดของทุกคนในรอบที่ดีที่สุด เรียงจากหัวข้อที่ทำได้น้อยที่สุด</CardDescription>
            </CardHeader>
            <CardContent>
              <TopicBars bars={s.topics.map((t) => ({ key: t.key, name: t.name, percent: t.percent, status: t.status, note: `${t.students} คน` }))} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>นักศึกษา ({s.students.length})</CardTitle>
              <CardDescription>เรียงจากคะแนนต่ำสุดขึ้นก่อน กดที่ชื่อเพื่อดูรอบที่ทำและเฉลยรายข้อ</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable.Root data={s.students} columns={columns} getRowId={(r: StudentLessonSummary) => r.student_id} pageSize={25}>
                <DataTable.Content empty={<EmptyState icon={<AlertCircleIcon />} title="ไม่มีข้อมูล" />} />
                <DataTable.Pagination />
              </DataTable.Root>
            </CardContent>
          </Card>
        </>
      )}

      {open && <StudentRounds key={open.student_id + lesson.id} student={open} user={data.users.get(open.student_id)} lesson={lesson} attempts={lessonAttempts} onClose={() => setOpen(null)} />}
    </div>
  )
}
