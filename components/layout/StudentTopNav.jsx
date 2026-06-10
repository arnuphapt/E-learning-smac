"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

export default function StudentTopNav() {
  const pathname = usePathname() || "";
  const onCourses = pathname === "/s/courses" || pathname.startsWith("/s/course") || pathname.startsWith("/s/lesson") || pathname.startsWith("/s/test") || pathname.startsWith("/s/assignment");
  const onCal = pathname === "/s/calendar";

  return (
    <div className="topnav">
      <Link href="/s/courses" className="logo pointer" style={{ textDecoration: 'none' }}>
        <span className="mark"><Icon name="grad" size={17} /></span>
        <div>NurseLearn<small>การพยาบาลผู้ใหญ่และผู้สูงอายุ</small></div>
      </Link>
      <nav>
        <Link href="/s/courses" className={onCourses ? "on" : ""} style={{ textDecoration: 'none' }}>รายวิชา</Link>
        <Link href="/s/calendar" className={onCal ? "on" : ""} style={{ textDecoration: 'none' }}>ปฏิทิน</Link>
        <Link href="/s/courses" style={{ textDecoration: 'none' }}>ความคืบหน้า</Link>
      </nav>
      <div className="proto-spacer" />
      <div className="rel">
        <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 10, color: "var(--subtle)" }} />
        <input className="input" style={{ width: 220, paddingLeft: 34, height: 38 }} placeholder="ค้นหารายวิชา บทเรียน…" />
      </div>
      <button className="iconbtn ghost"><Icon name="bell" size={18} /></button>
      <div className="flex items-center gap-2">
        <Avatar name="นภัส" size={34} />
        <div style={{ lineHeight: 1.2 }}>
          <div className="t-sm fw-6">นภัสสร ใจดี</div>
          <div className="t-xs muted">นักศึกษาพยาบาล ปี 3</div>
        </div>
      </div>
    </div>
  );
}
