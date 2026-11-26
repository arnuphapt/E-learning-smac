import { toast } from "sonner"
import type { Json } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { useConfirm } from "@/components/common/confirm"
import { deleteAssignmentTree } from "@/components/course/actions"
import { errMsg, type AssignmentRow, type LessonRow, type RubricCriterion } from "./types"

export async function saveAssignmentWithRubric({
  lesson,
  assignmentId,
  rubricId,
  title,
  instructions,
  due,
  dueTime,
  allowLate,
  allowFile,
  allowText,
  criteria,
}: {
  lesson: LessonRow
  assignmentId?: string | null
  rubricId?: string | null
  title: string
  instructions: string
  due: string
  dueTime: string
  allowLate: boolean
  allowFile: boolean
  allowText: boolean
  criteria: RubricCriterion[]
}): Promise<boolean> {
  const total = criteria.reduce((s, c) => s + c.max, 0)
  const asgObj = {
    title,
    instructions,
    due,
    due_time: dueTime,
    allow_late: allowLate,
    points: total,
    allow_file: allowFile,
    allow_text: allowText,
    lesson_id: lesson.id,
    course_id: lesson.course_id,
  }

  let error: { message: string } | null = null
  let nextId = assignmentId || ""
  if (assignmentId) {
    ;({ error } = await supabase.from("assignments").update(asgObj).eq("id", assignmentId))
  } else {
    nextId = "a_" + Date.now()
    ;({ error } = await supabase.from("assignments").insert([{ id: nextId, ...asgObj }]))
  }

  if (!error) {
    const criteriaJson = criteria as unknown as Json
    if (rubricId) {
      ;({ error } = await supabase.from("rubrics").update({ criteria: criteriaJson }).eq("id", rubricId))
    } else {
      const nextRubricId = "r_" + Date.now()
      ;({ error } = await supabase.from("rubrics").insert([{ id: nextRubricId, title: title + " Rubric", criteria: criteriaJson }]))
      if (!error && !assignmentId) await supabase.from("assignments").update({ rubric_id: nextRubricId }).eq("id", nextId)
    }
  }

  if (error) {
    toast.error("เกิดข้อผิดพลาดในการบันทึก: " + errMsg(error))
    return false
  }
  toast.success("บันทึกใบงานและ Rubric เรียบร้อยแล้ว")
  return true
}

/** Confirms, then deletes an assignment with its submissions and rubric. Resolves true when deleted. */
export function useDeleteAssignment() {
  const confirm = useConfirm()
  return async (a: Pick<AssignmentRow, "id" | "title" | "rubric_id">) => {
    const confirmed = await confirm({
      title: "ลบใบงาน",
      message: `คุณต้องการลบใบงาน "${a.title}" ใช่หรือไม่?\n\nคำเตือน: การดำเนินการนี้จะลบรายการส่งงานและคะแนนของนักศึกษาทั้งหมดในใบงานนี้อย่างถาวร!`,
      danger: true,
      confirmText: "ลบใบงาน",
      cancelText: "ยกเลิก",
    })
    if (!confirmed) return false
    try {
      await deleteAssignmentTree([{ id: a.id, rubric_id: a.rubric_id }])
      toast.success("ลบใบงานเรียบร้อยแล้ว")
      return true
    } catch (error: unknown) {
      console.error("Error deleting assignment:", error)
      toast.error("เกิดข้อผิดพลาดในการลบใบงาน: " + errMsg(error))
      return false
    }
  }
}
