"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AwardIcon, PlusIcon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { hasRole } from "@/lib/roles"
import { bankWarning, lockSummary } from "@/lib/tutor-bank"
import { PageContainer } from "@/components/common/page-container"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/states"
import { DataTable } from "@/components/common/data-table"
import { Button } from "@/components/ui/button"
import { CreateSetDialog } from "@/components/tutor/create-set-dialog"
import { setColumns } from "@/components/tutor/set-columns"
import type { TutorSetSummary } from "@/components/tutor/sets"

// Teacher list of tutor sets. /i/courses reads the `courses` view, which hides them, so this page reads courses_all.
// Same visibility rule as /i/courses: admin = all, course_manager = own subject group, instructor = assigned courses.
// Each row says whether students can actually use the set: lock (empty = nobody) and lessons whose bank is short.
export default function InstructorTutorSets() {
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user
  const canCreate = hasRole(user?.role, "admin", "course_manager")
  const [sets, setSets] = useState<TutorSetSummary[] | null>(null)
  const [creating, setCreating] = useState(false)
  const columns = useMemo(() => setColumns((c) => router.push("/i/tutor/" + c.id)), [router])

  useEffect(() => {
    const userId = user?.id
    if (!user || !userId) return
    let cancelled = false
    ;(async () => {
      const [cRes, lRes, qRes, ciRes] = await Promise.all([
        supabase.from("courses_all").select("*").eq("kind", "tutor").order("code"),
        supabase.from("lessons").select("id, course_id, status, tutor_draw_count"),
        supabase.from("questions").select("lesson_id").eq("kind", "tutor"),
        supabase.from("course_instructors").select("course_id").eq("user_id", userId),
      ])
      if (cancelled) return

      const mine = (ciRes.data || []).map((ci) => ci.course_id)
      const visible = (cRes.data || []).filter((c) => {
        if (hasRole(user.role, "admin")) return true
        if (hasRole(user.role, "course_manager")) {
          return c.group_id === user.group_id || Boolean(c.group_id && user.group_ids?.includes(c.group_id))
        }
        if (hasRole(user.role, "instructor")) return mine.includes(c.id)
        return false
      })

      const bank: Record<string, number> = {}
      for (const q of qRes.data || []) {
        if (q.lesson_id) bank[q.lesson_id] = (bank[q.lesson_id] || 0) + 1
      }
      setSets(
        visible.map((c) => {
          const lessons = (lRes.data || []).filter((l) => l.course_id === c.id)
          return {
            ...c,
            lessonCount: lessons.length,
            published: lessons.filter((l) => l.status === "active").length,
            questions: lessons.reduce((n, l) => n + (bank[l.id] || 0), 0),
            short: lessons.filter((l) => bankWarning(bank[l.id] || 0, l.tutor_draw_count)).length,
          }
        }),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const stats = sets
    ? `${sets.length} ชุด · ${sets.reduce((n, s) => n + s.questions, 0)} ข้อในคลัง · ${sets.filter((s) => !lockSummary(s).open).length} ชุดที่ยังไม่มีนักศึกษาเข้าได้`
    : undefined

  return (
    <PageContainer>
      <PageHeader
        kicker="โหมดติว"
        title="ชุดติว"
        description={stats}
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <PlusIcon />
              สร้างชุดติว
            </Button>
          )
        }
      />
      <DataTable.Root data={sets ?? []} columns={columns} getRowId={(r: TutorSetSummary) => r.id} searchKeys={["title", "code"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อหรือรหัสชุดติว…" />
        </DataTable.Toolbar>
        <DataTable.Content
          loading={!sets}
          empty={
            <EmptyState
              icon={<AwardIcon />}
              title="ยังไม่มีชุดติว"
              description={canCreate ? "กด “สร้างชุดติว” เพื่อเริ่ม ชุดติวไม่ปะปนกับรายวิชาปกติ" : "ผู้ดูแลหรืออาจารย์ผู้รับผิดชอบจะเป็นผู้สร้างชุดติว แล้วมอบหมายให้คุณ"}
            />
          }
        />
        <DataTable.Pagination />
      </DataTable.Root>
      {creating && user && <CreateSetDialog user={user} onClose={() => setCreating(false)} />}
    </PageContainer>
  )
}
