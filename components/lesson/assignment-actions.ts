import { toast } from "sonner"
import { useConfirm } from "@/components/common/confirm"
import { deleteAssignmentTree } from "@/components/course/actions"
import { errMsg, type AssignmentRow } from "./types"

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
