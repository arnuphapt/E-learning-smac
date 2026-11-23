const ROLE_LABELS: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  instructor: "อาจารย์ผู้สอน",
  course_manager: "อาจารย์ผู้รับผิดชอบรายวิชา",
  student: "นักศึกษา",
  tutor_guest: "ผู้ใช้ภายนอก (ชุดติว)",
}

/** "admin,instructor" -> "ผู้ดูแลระบบ, อาจารย์ผู้สอน" (same text the old sidebar and header showed). */
export function displayRole(role: string | null | undefined, fallback = "อาจารย์ผู้สอน"): string {
  const roles = role ? role.split(",").map((r) => r.trim()) : []
  return roles.map((r) => ROLE_LABELS[r] || r).join(", ") || fallback
}

export function initials(name: string | null | undefined): string {
  return (name || "อ").trim().charAt(0).toUpperCase()
}
