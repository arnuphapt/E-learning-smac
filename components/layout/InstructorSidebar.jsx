"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";
import React, { Suspense } from "react";
import { useSession, signOut } from "next-auth/react";

function InstructorSidebarContent() {
  const { data: session } = useSession();
  const roleLabels = {
    admin: "ผู้ดูแลระบบ",
    instructor: "อาจารย์ผู้สอน",
    student: "นักศึกษา",
  };
  const displayRole = roleLabels[session?.user?.role] || session?.user?.role || "อาจารย์ผู้สอน";
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "years";

  const items1 = [["/i/courses", "grid", "ภาพรวม / รายวิชา", pathname.startsWith("/i/course") || pathname === "/i/courses" || pathname.startsWith("/i/lesson")]];
  const items2 = [
    ["/i/submissions/a1", "file", "ตรวจใบงาน", pathname.startsWith("/i/submissions") || pathname.startsWith("/i/grade")],
    ["/i/reports", "chart", "รายงาน / ส่งออก Excel", pathname.startsWith("/i/reports")],
  ];
  
  const isMaster = pathname.startsWith("/i/master");
  const items3 = [
    ["/i/master/years", "cal", "ปีการศึกษา", pathname === "/i/master/years" || (pathname === "/i/master" && tab === "years")],
    ["/i/master/terms", "layers", "ภาคเรียน", pathname === "/i/master/terms"],
    ["/i/master/groups", "folder", "กลุ่มวิชา", pathname === "/i/master/groups"],
    ["/i/master/sections", "users", "Section / กลุ่มเรียน", pathname === "/i/master/sections"],
    ["/i/master/course-access", "lock", "สิทธิ์การเข้าถึง", pathname === "/i/master/course-access"],
    ["/i/master/users", "user", "จัดการผู้ใช้งาน", pathname === "/i/master/users"],
  ];

  const Item = ([to, ic, label, active]) => (
    <Link href={to} key={to + label} className={"sb-item" + (active ? " on" : "")} style={{ textDecoration: 'none' }}>
      <Icon name={ic} size={18} className="ic" />{label}
    </Link>
  );

  return (
    <div className="sidebar app-scroll">
      <Link href="/i/courses" className="logo pointer" style={{ textDecoration: 'none' }}>
        <span className="mark"><Icon name="grad" size={17} /></span>
        <div>E-learning<small>พื้นที่อาจารย์ผู้สอน</small></div>
      </Link>
      <Link href="/i/course/new" className="btn btn-primary btn-block" style={{ margin: "0 2px 6px", textDecoration: 'none' }}>
        <Icon name="plus" size={16} />สร้างรายวิชา
      </Link>
      
      <div className="sb-label">การสอน</div>
      {items1.map(Item)}
      
      <div className="sb-label">งานและคะแนน</div>
      {items2.map(Item)}
      
      <div className="sb-label">ตั้งค่าข้อมูลหลัก (Master)</div>
      {items3.map(Item)}
      
      <div className="sb-label">อื่นๆ</div>
      <Link href="/i/courses" className="sb-item" style={{ textDecoration: 'none' }}><Icon name="msg" size={18} className="ic" />ข้อความนักศึกษา</Link>
      <Link href="/i/courses" className="sb-item" style={{ textDecoration: 'none' }}><Icon name="settings" size={18} className="ic" />ตั้งค่าระบบ</Link>
      
      <div className="sb-foot">
        <Avatar name={session?.user?.name || "สุภาวดี"} src={session?.user?.image} size={36} />
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-sm fw-6 truncate">{session?.user?.name || "อ. ดร. สุภาวดี ทองคำ"}</div>
          <div className="t-xs muted">{displayRole}</div>
        </div>
        <button 
          className="iconbtn ghost pointer" 
          title="ออกจากระบบ" 
          style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <Icon name="logout" size={17} />
        </button>
      </div>
    </div>
  );
}

export default function InstructorSidebar() {
  return (
    <Suspense fallback={<div className="sidebar app-scroll" />}>
      <InstructorSidebarContent />
    </Suspense>
  );
}
