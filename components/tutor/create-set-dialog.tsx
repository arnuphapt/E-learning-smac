"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckIcon, Loader2Icon } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { hasRole } from "@/lib/roles"
import { FormField } from "@/components/common/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "./sets"

const TUTOR_HERO = "#4338a8"

interface CreatorUser {
  id?: string
  name?: string | null
  role?: string | null
  group_id?: string | null
  group_ids?: string[] | null
}

// New tutor set: name + code, then straight into its workspace. Mounted only while open so the fields reset.
export function CreateSetDialog({ user, onClose }: { user: CreatorUser; onClose: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [saving, setSaving] = useState(false)

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const userId = user.id
    if (!userId) return
    if (!title.trim() || !code.trim()) {
      toast.warning("กรุณากรอกชื่อชุดและรหัสชุด")
      return
    }
    setSaving(true)
    try {
      const [tRes, gRes] = await Promise.all([supabase.from("terms").select("*"), supabase.from("subject_groups").select("*").eq("status", "active")])
      const t = (tRes.data || [])[0]
      const groupId = user.group_id || user.group_ids?.[0] || (hasRole(user.role, "admin") ? gRes.data?.[0]?.id : null) || null
      const row = {
        id: "c_" + Date.now(),
        code: code.trim(),
        title: title.trim(),
        subtitle: "",
        term: t ? `${t.name} ${t.year}` : "",
        year: String(t ? t.year : new Date().getFullYear() + 543),
        instructor: user.name || null,
        group_id: groupId,
        group_name: (gRes.data || []).find((g) => g.id === groupId)?.name || null,
        section: null,
        lessons: 0,
        students: 0,
        progress: 0,
        hero: TUTOR_HERO,
        year_level: [],
        access: { allowedYears: [], allowedEmails: [] },
        kind: "tutor",
      }
      // courses_all, not the `courses` view: the view's WITH CHECK OPTION rejects kind = 'tutor' rows.
      const { error } = await supabase.from("courses_all").insert([row])
      if (error) throw error
      const { error: linkErr } = await supabase.from("course_instructors").insert([{ course_id: row.id, user_id: userId }])
      if (linkErr) console.error("Error linking course instructor:", linkErr)
      router.push("/i/tutor/" + row.id)
    } catch (err: unknown) {
      toast.error("สร้างชุดติวไม่สำเร็จ: " + getErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={create} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>ชุดติวใหม่</DialogTitle>
            <DialogDescription>ตั้งชื่อก่อน แล้วค่อยเพิ่มบทเรียน คลังข้อสอบ และกำหนดว่านักศึกษากลุ่มไหนเข้าได้ในหน้าถัดไป</DialogDescription>
          </DialogHeader>
          <FormField label="ชื่อชุดติว" htmlFor="new-set-title" required>
            <Input id="new-set-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ติวสอบรวบยอด การพยาบาลผู้ใหญ่ 1" autoFocus />
          </FormField>
          <FormField label="รหัสชุด" htmlFor="new-set-code" required>
            <Input id="new-set-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น NUR301-TUTOR" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
              สร้างและเปิดชุดนี้
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
