import { useEffect, useState } from "react"
import type { Database, Json } from "@/lib/database.types"
import { supabase } from "@/lib/supabase"
import { DEFAULT_DOMAIN, type GradeRule, type SectionRule } from "@/lib/course-access"

export interface TutorCourseAccess {
  allowedEmails?: string[]
  [key: string]: unknown
}

export interface TutorCourse {
  id: string
  code?: string | null
  title?: string | null
  subtitle?: string | null
  hero?: string | null
  year_level?: number[] | null
  section?: string | null
  access?: TutorCourseAccess | Json | null
  instructor?: string | null
}

export interface StudentUserRow {
  id: string
  name: string
  email: string | null
  student_no: string | null
  section: string | null
  study_year: number | null
  role: string | null
}

export interface StaffUserRow {
  id: string
  name: string
  email: string | null
}

export type SectionRow = Database["public"]["Tables"]["sections"]["Row"] & SectionRule

export interface YearOption {
  label: string
  value: number
  domain: string
}

export interface LookupState {
  mainIds: string[]
  students: StudentUserRow[]
  staff: StaffUserRow[]
  sections: SectionRow[]
  grades: GradeRule[]
  yearOptions: YearOption[]
  assigned: string[]
}

// Tutor-set card colours: stored as courses.hero, so they are data (hex), not theme tokens.
export const HERO_COLORS = ["#4338a8", "#0d6e8c", "#1e5fa8", "#2f7d5b", "#b4530b", "#0b1220"]

const yearNo = (label: string) => parseInt(String(label).replace(/\D/g, ""), 10)
export const normYears = (list: readonly (number | string)[] | null | undefined): number[] => (list || []).map(Number).filter(Boolean)
export const sameList = <T,>(a: readonly T[], b: readonly T[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())

export function getAllowedEmails(access: TutorCourse["access"]): string[] {
  if (!access || typeof access !== "object" || Array.isArray(access)) return []
  const list = (access as { allowedEmails?: unknown }).allowedEmails
  return Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : []
}

// Checkable year levels. courses.year_level is integer[]: a school level locks by its number (read from the label), a
// level of an external domain by student_grades.year_no (the same key for every prefix of one label in that domain).
const yearOptionsOf = (grades: readonly GradeRule[]): YearOption[] => {
  const seen = new Map<number, YearOption>()
  for (const g of grades) {
    const domain = g.domain || DEFAULT_DOMAIN
    const value = domain === DEFAULT_DOMAIN ? yearNo(g.year_label) : g.year_no
    if (value && !seen.has(value)) seen.set(value, { label: g.year_label, value, domain })
  }
  return [...seen.values()].sort((a, b) =>
    a.domain === b.domain ? a.label.localeCompare(b.label, "th") : a.domain === DEFAULT_DOMAIN ? -1 : b.domain === DEFAULT_DOMAIN ? 1 : a.domain.localeCompare(b.domain),
  )
}

/** Students, staff, sections, year levels and the assigned instructors for one tutor set; null until loaded. */
export function useTutorLookup(course: Pick<TutorCourse, "id" | "instructor">, onMains: (ids: string[]) => void) {
  const [lookup, setLookup] = useState<LookupState | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [stRes, staffRes, secRes, gRes, ciRes] = await Promise.all([
        supabase.from("users").select("id, name, email, student_no, section, study_year, role").in("role", ["student", "tutor_guest"]),
        supabase.from("users").select("id, name, email").or("role.like.%instructor%,role.like.%course_manager%,role.like.%admin%"),
        supabase.from("sections").select("*").eq("status", "active"),
        supabase.from("student_grades").select("prefix, year_label, domain, year_no"),
        supabase.from("course_instructors").select("user_id").eq("course_id", course.id),
      ])
      if (cancelled) return
      const staff = staffRes.data || []
      const names = (course.instructor || "").split(",").map((n) => n.trim()).filter(Boolean)
      const mainIds = staff.filter((u) => names.includes(u.name)).map((u) => u.id)
      onMains(mainIds)
      setLookup({
        mainIds,
        students: stRes.data || [],
        staff,
        sections: secRes.data || [],
        grades: gRes.data || [],
        yearOptions: yearOptionsOf(gRes.data || []),
        assigned: (ciRes.data || []).map((r) => r.user_id),
      })
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, course.instructor])

  return [lookup, setLookup] as const
}
