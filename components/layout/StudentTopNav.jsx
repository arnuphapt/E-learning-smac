"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

export default function StudentTopNav() {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  const roleLabels = {
    admin: "ผู้ดูแลระบบ",
    instructor: "อาจารย์ผู้สอน",
    student: "นักศึกษา",
  };
  const displayRole = roleLabels[session?.user?.role] || session?.user?.role || "นักศึกษา";
  const onCourses = pathname === "/s/courses" || pathname.startsWith("/s/course") || pathname.startsWith("/s/lesson") || pathname.startsWith("/s/test");
  const onAssignments = pathname.startsWith("/s/assignments") || pathname.startsWith("/s/assignment");
  const onCal = pathname === "/s/calendar";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="topnav">
      <Link href="/s/courses" className="logo pointer" style={{ textDecoration: 'none' }}>
        <span className="mark"><Icon name="grad" size={17} /></span>
        <div>E-learning<small>การพยาบาลผู้ใหญ่และผู้สูงอายุ</small></div>
      </Link>
      <nav>
        <Link href="/s/courses" className={onCourses ? "on" : ""} style={{ textDecoration: 'none' }}>รายวิชา</Link>
        <Link href="/s/assignments" className={onAssignments ? "on" : ""} style={{ textDecoration: 'none' }}>ใบงาน</Link>
        <Link href="/s/calendar" className={onCal ? "on" : ""} style={{ textDecoration: 'none' }}>ปฏิทิน</Link>
        <Link href="/s/courses" style={{ textDecoration: 'none' }}>ความคืบหน้า</Link>
      </nav>
      <div className="proto-spacer" />
      <div className="rel">
        <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 10, color: "var(--subtle)" }} />
        <input className="input" style={{ width: 220, paddingLeft: 34, height: 38 }} placeholder="ค้นหารายวิชา บทเรียน…" />
      </div>
      <button className="iconbtn ghost"><Icon name="bell" size={18} /></button>
      
      <div className="rel" ref={menuRef}>
        <div className="flex items-center gap-2 pointer" onClick={() => setMenuOpen(!menuOpen)} style={{ padding: "4px 8px", borderRadius: 8, transition: ".15s", background: menuOpen ? "var(--muted)" : "transparent" }}>
          <Avatar name={session?.user?.name || "นักศึกษา"} src={session?.user?.image} size={34} />
          <div style={{ lineHeight: 1.2 }}>
            <div className="t-sm fw-6">{session?.user?.name || "กำลังโหลด..."}</div>
            <div className="t-xs muted">{displayRole}</div>
          </div>
          <Icon name="chevD" size={16} className="muted" />
        </div>

        {menuOpen && (
          <div className="card shadow" style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 220, zIndex: 100, padding: 8 }}>
            <Link href="/s/profile" className="flex items-center gap-3 p-2 pointer" style={{ borderRadius: 8, textDecoration: 'none', color: "var(--fg)" }} onClick={() => setMenuOpen(false)}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="user" size={16} /></div>
              <div><div className="t-sm fw-6">โปรไฟล์ส่วนตัว</div><div className="t-xs muted">ข้อมูลและการตั้งค่า</div></div>
            </Link>
            <hr className="divider" style={{ margin: "8px 0" }} />
            <button className="flex items-center gap-3 p-2 pointer w-full" style={{ borderRadius: 8, background: "transparent", border: 0, textAlign: "left", color: "var(--danger)" }} onClick={() => signOut({ callbackUrl: "/login" })}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="x" size={16} /></div>
              <div className="t-sm fw-6">ออกจากระบบ</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
