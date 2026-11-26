import {
  Award, BarChart3, Bell, BookOpen, Bot, CalendarDays, ClipboardList, FileCheck, Folder, GraduationCap,
  LayoutGrid, Layers, Library, ListChecks, Radio, ShieldCheck, Sparkles, Target, UserCog, Users,
} from "lucide-react"
import { PERMISSIONS } from "../rbac.ts"
import type { NavConfig } from "./types.ts"

export const instructorNav: NavConfig = {
  subtitle: "พื้นที่อาจารย์ผู้สอน",
  homeHref: "/i/courses",
  userLinks: [{ title: "มุมมองนักศึกษา", href: "/s/courses", icon: GraduationCap }],
  redirects: ["/i"],
  groups: [
    {
      label: "การสอน",
      items: [
        {
          title: "รายวิชา",
          icon: BookOpen,
          permission: PERMISSIONS.COURSES_VIEW,
          items: [
            {
              title: "รายวิชาทั้งหมด",
              href: "/i/courses",
              icon: LayoutGrid,
              permission: PERMISSIONS.COURSES_VIEW,
              match: ["/i/course/[id]", "/i/lesson/[id]/**"],
            },
          ],
        },
        {
          title: "ชุดติว",
          icon: Award,
          permission: PERMISSIONS.COURSES_VIEW,
          items: [
            {
              title: "ชุดติวทั้งหมด",
              href: "/i/tutor",
              icon: ListChecks,
              permission: PERMISSIONS.COURSES_VIEW,
              match: ["/i/tutor/[id]", "/i/lesson/[id]/bank"],
            },
            { title: "คลังข้อสอบ", href: "/i/tutor/bank", icon: Library, permission: PERMISSIONS.COURSES_VIEW },
          ],
        },
        {
          title: "คลังการสอน",
          icon: Library,
          permission: PERMISSIONS.COURSES_VIEW,
          items: [
            { title: "แบบทดสอบก่อนเรียน", href: "/i/master/pretests", icon: ClipboardList, permission: PERMISSIONS.COURSES_VIEW },
            { title: "แบบทดสอบหลังเรียน", href: "/i/master/posttests", icon: ListChecks, permission: PERMISSIONS.COURSES_VIEW },
            { title: "ใบงาน", href: "/i/master/worksheets", icon: FileCheck, permission: PERMISSIONS.COURSES_VIEW },
          ],
        },
        {
          title: "รวมเกม",
          icon: Target,
          permission: PERMISSIONS.COURSES_VIEW,
          items: [
            {
              title: "ชุดควิซ",
              href: "/i/live/quizzes",
              icon: ClipboardList,
              permission: PERMISSIONS.COURSES_VIEW,
              match: ["/i/live/quizzes/[id]"],
            },
            {
              title: "ห้องควิซ",
              href: "/i/live",
              icon: Radio,
              permission: PERMISSIONS.COURSES_VIEW,
              match: ["/i/live/[id]/**"],
            },
          ],
        },
      ],
    },
    {
      label: "งานและคะแนน",
      items: [
        {
          title: "ตรวจใบงาน",
          href: "/i/submissions",
          icon: FileCheck,
          permission: PERMISSIONS.SUBMISSIONS_VIEW,
          match: ["/i/submissions/[id]", "/i/grade/[id]"],
        },
        { title: "รายงาน / ส่งออก Excel", href: "/i/reports", icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW },
        { title: "ประวัติการใช้งาน AI", href: "/i/ai-logs", icon: Sparkles },
      ],
    },
    {
      label: "ข้อมูลหลักสูตร",
      items: [
        { title: "ปีการศึกษา", href: "/i/master/years", icon: CalendarDays, permission: PERMISSIONS.MASTER_MANAGE },
        { title: "ภาคเรียน", href: "/i/master/terms", icon: Layers, permission: PERMISSIONS.MASTER_MANAGE },
        { title: "กลุ่มวิชา", href: "/i/master/groups", icon: Folder, permission: PERMISSIONS.MASTER_MANAGE },
      ],
    },
    {
      label: "นักศึกษา",
      items: [
        { title: "กลุ่มเรียน", href: "/i/master/sections", icon: Users, permission: PERMISSIONS.MASTER_MANAGE },
        { title: "กำหนดชั้นปีนักศึกษา", href: "/i/master/studentgrade", icon: GraduationCap, permission: PERMISSIONS.MASTER_MANAGE },
      ],
    },
    {
      label: "จัดการระบบ",
      items: [
        { title: "จัดการผู้ใช้งาน", href: "/i/master/users", icon: UserCog, permission: PERMISSIONS.USERS_MANAGE },
        { title: "จัดการสิทธิ์", href: "/i/master/roles", icon: ShieldCheck, permission: PERMISSIONS.USERS_MANAGE },
        { title: "ประกาศ", href: "/i/master/broadcasts", icon: Bell, permission: PERMISSIONS.BROADCASTS_MANAGE },
        { title: "กำหนด Persona AI", href: "/i/master/ai-persona", icon: Bot, permission: PERMISSIONS.MASTER_MANAGE },
      ],
    },
  ],
}
