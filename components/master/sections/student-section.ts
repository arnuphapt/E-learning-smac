import type { SectionItem } from "./section-dialog"

/** Section a student belongs to: matched by the last 3 digits of student_no against each section's range, else their own `section`. */
export const getStudentSectionName = (
  studentNo: string | null | undefined,
  defaultSection: string | null | undefined,
  sectionsList: SectionItem[],
): string | null => {
  if (!studentNo || !sectionsList || sectionsList.length === 0) return defaultSection || "-"
  const snoStr = String(studentNo).trim()
  if (snoStr.length < 3) return defaultSection || "-"
  const last3 = parseInt(snoStr.slice(-3), 10)
  if (isNaN(last3)) return defaultSection || "-"

  for (const s of sectionsList) {
    if (s.range_start && s.range_end) {
      const start = parseInt(s.range_start, 10)
      const end = parseInt(s.range_end, 10)
      if (!isNaN(start) && !isNaN(end)) {
        if (last3 >= start && last3 <= end) {
          return s.name
        }
      }
    }
  }
  return defaultSection || "-"
}
