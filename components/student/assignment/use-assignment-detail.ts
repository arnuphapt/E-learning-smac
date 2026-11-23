"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import type { Database } from "@/lib/database.types"
import { STUDENT_LESSON_COLUMNS } from "@/lib/files"
import { isStaffRole } from "@/lib/roles"
import { supabase } from "@/lib/supabase"
import type { RubricRow } from "./files"

type AssignmentRow = Database["public"]["Tables"]["assignments"]["Row"] & { score?: number | null }
type CourseRow = Database["public"]["Views"]["courses"]["Row"]
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"]
export type InstructorDirectoryRow = Database["public"]["Views"]["user_directory"]["Row"]

interface StudentLessonRow {
  id: string
  index: number | null
  status: string | null
}

// The DB trigger rejects any student write to a graded submission; show a friendly message for that case only.
const writeError = (prefix: string, error: { message?: string }) =>
  error.message?.includes("graded submission")
    ? "ใบงานนี้ตรวจให้คะแนนแล้ว ไม่สามารถส่งหรือแก้ไขได้อีก"
    : prefix + (error.message || "")

/** One assignment for the signed-in student: data, the draft being edited, and upload / save / submit / cancel. */
export function useAssignmentDetail(asgId: string | undefined) {
  const { data: session, status: authStatus } = useSession()
  const studentId = session?.dbId
  const role = session?.user?.role

  const [a, setA] = useState<AssignmentRow | null>(null)
  const [lesson, setLesson] = useState<StudentLessonRow | null>(null)
  const [course, setCourse] = useState<CourseRow | null>(null)
  const [rubric, setRubric] = useState<RubricRow | null>(null)
  const [submission, setSubmission] = useState<SubmissionRow | null>(null)
  const [instructors, setInstructors] = useState<InstructorDirectoryRow[]>([])

  const [status, setStatus] = useState("not-submitted")
  const [text, setText] = useState("")
  const [file, setFile] = useState<string | null>(null)
  const [graderId, setGraderId] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return
    let cancelled = false
    async function load() {
      if (!asgId) return
      const { data: aData } = await supabase.from("assignments").select("*").eq("id", asgId).single()
      if (!aData) {
        setLoading(false)
        return
      }
      const { data: lData } = aData.lesson_id
        ? await supabase.from("lessons").select(STUDENT_LESSON_COLUMNS).eq("id", aData.lesson_id).single()
        : { data: null }

      if ((!lData || lData.status === "draft") && !isStaffRole(role)) {
        setA(null)
        setLoading(false)
        return
      }
      const { data: cData } = aData.course_id
        ? await supabase.from("courses").select("*").eq("id", aData.course_id).single()
        : { data: null }
      const { data: rData } = aData.rubric_id
        ? await supabase.from("rubrics").select("*").eq("id", aData.rubric_id).single()
        : { data: null }
      if (cancelled) return

      setA(aData)
      setLesson(lData)
      setCourse(cData)
      setRubric(rData)

      const { data: ciData } = aData.course_id
        ? await supabase.from("course_instructors").select("user_id").eq("course_id", aData.course_id)
        : { data: null }
      if (cancelled) return
      const userIds = ciData ? ciData.map((ci) => ci.user_id) : []
      if (userIds.length > 0) {
        // user_directory = staff id/name/role without email (students can't read `users` for staff)
        const { data: instData } = await supabase.from("user_directory").select("id, name, role").in("id", userIds)
        setInstructors(instData || [])
      } else {
        setInstructors([])
      }

      if (studentId) {
        const { data: subData } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", studentId)
          .eq("assignment_id", asgId)
          .maybeSingle()
        if (cancelled) return
        if (subData) {
          setSubmission(subData)
          setStatus(subData.status || "not-submitted")
          setFile(subData.file)
          setText(subData.text || "")
          setGraderId(subData.grader_id || "")
          setA((prev) => (prev ? { ...prev, score: subData.score } : prev))
        }
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [asgId, studentId, role, authStatus])

  const canSubmit = Boolean(((a?.allow_file && file) || (a?.allow_text && text.trim())) && (instructors.length === 0 || graderId))

  const upload = async (uploadedFile: File) => {
    setUploading(true)
    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadedFile.name,
          filetype: uploadedFile.type,
          folder: `submissions/${studentId || "guest"}/${asgId}`,
        }),
      })
      if (!presignRes.ok) throw new Error("Failed to get upload signature")
      const { uploadUrl, key } = (await presignRes.json()) as { uploadUrl?: string; key: string }
      if (uploadUrl) {
        const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": uploadedFile.type }, body: uploadedFile })
        if (!uploadRes.ok) throw new Error("Failed to upload file to Cloudflare R2")
      }
      setFile(key)
      toast.success("อัปโหลดไฟล์สำเร็จ")
    } catch (err: unknown) {
      console.error(err)
      toast.error("เกิดข้อผิดพลาดในการอัปโหลด: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
    }
  }

  const save = async (next: "submitted" | "not-submitted") => {
    const submitting = next === "submitted"
    if (!studentId) {
      toast.warning(submitting ? "กรุณาเข้าสู่ระบบก่อนส่งงาน" : "กรุณาเข้าสู่ระบบก่อนบันทึกฉบับร่าง")
      return
    }
    if (!a || !asgId) return
    const subObj: SubmissionRow = {
      id: submission?.id || "sub_" + Date.now(),
      student_id: studentId,
      assignment_id: asgId,
      status: next,
      submitted_at: submitting
        ? new Date().toLocaleDateString("th-TH") + " " + new Date().toLocaleTimeString("th-TH").slice(0, 5) + " น."
        : null,
      file: file || null,
      text: text || null,
      score: null,
      total: a.points,
      late: false,
      grader_id: graderId || null,
    }
    const { error } = await supabase.from("submissions").upsert([subObj])
    if (error) {
      toast.error(writeError(submitting ? "เกิดข้อผิดพลาดในการส่ง: " : "เกิดข้อผิดพลาดในการบันทึก: ", error))
      return
    }
    setStatus(next)
    setSubmission(subObj)
    toast.success(submitting ? "ส่งใบงานเรียบร้อยแล้ว" : "บันทึกฉบับร่างเรียบร้อยแล้ว")
  }

  const cancelSubmit = async () => {
    if (!studentId || !asgId) return
    const { error } = await supabase.from("submissions").delete().eq("student_id", studentId).eq("assignment_id", asgId)
    if (error) {
      toast.error(writeError("เกิดข้อผิดพลาดในการยกเลิก: ", error))
      return
    }
    setStatus("not-submitted")
    setSubmission(null)
    setFile(null)
    setText("")
    toast.success("ยกเลิกการส่งใบงานแล้ว")
  }

  return {
    loading, a, lesson, course, rubric, submission, instructors,
    status, text, setText, file, setFile, graderId, setGraderId, uploading, canSubmit,
    upload, submit: () => save("submitted"), saveDraft: () => save("not-submitted"), cancelSubmit,
  }
}
