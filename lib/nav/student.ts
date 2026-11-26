import { Award, Bell, Bot, BookOpen, CalendarDays, ClipboardList, Target, UserRound } from "lucide-react"
import type { NavConfig } from "./types.ts"

export const studentNav: NavConfig = {
  subtitle: "การพยาบาลผู้ใหญ่และผู้สูงอายุ",
  homeHref: "/s/courses",
  roleFallback: "นักศึกษา",
  restrictTutorOnly: true,
  userLinks: [
    { title: "โปรไฟล์ส่วนตัว", href: "/s/profile", icon: UserRound, hideForTutorOnly: true },
    { title: "ระบบจัดการผู้สอน", href: "/i/courses", icon: BookOpen, staffOnly: true },
  ],
  redirects: ["/s"],
  groups: [
    {
      label: "การเรียน",
      items: [
        {
          title: "รายวิชา",
          href: "/s/courses",
          icon: BookOpen,
          match: ["/s/course/[id]", "/s/lesson/[id]/**", "/s/test/**"],
        },
        { title: "ชุดติว", href: "/s/tutor", icon: Award, tutorOk: true, match: ["/s/tutor/[id]", "/s/tutor/lesson/[id]/**"] },
        { title: "รวมเกม", href: "/s/live", icon: Target, match: ["/s/live/[id]"] },
        { title: "ใบงาน", href: "/s/assignments", icon: ClipboardList, match: ["/s/assignment/[id]"] },
      ],
    },
    {
      label: "ติดตาม",
      items: [
        { title: "ปฏิทิน", href: "/s/calendar", icon: CalendarDays },
        { title: "ประกาศ", href: "/s/broadcasts", icon: Bell },
        { title: "AI ผู้ช่วย", href: "/s/ai", icon: Bot },
      ],
    },
    {
      label: "บัญชี",
      items: [{ title: "โปรไฟล์", href: "/s/profile", icon: UserRound }],
    },
  ],
}
