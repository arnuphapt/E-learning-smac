"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";
import React, { Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { hasPermission, hasAnyPermission, PERMISSIONS } from "@/lib/rbac";

function InstructorSidebarContent({ open, onClose }) {
  const { data: session } = useSession();
  const roleLabels = {
    admin: "ผู้ดูแลระบบ",
    instructor: "อาจารย์ผู้สอน",
    course_manager: "อาจารย์ผู้รับผิดชอบรายวิชา",
    student: "นักศึกษา",
  };
  const roles = session?.user?.role ? session.user.role.split(",").map(r => r.trim()) : [];
  const displayRole = roles.map(r => roleLabels[r] || r).join(", ") || "อาจารย์ผู้สอน";
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "years";

  const user = session?.user;

  let items1 = [];
  if (hasPermission(user, PERMISSIONS.COURSES_VIEW)) {
    items1.push(["/i/courses", "grid", "ภาพรวม / รายวิชา", pathname.startsWith("/i/course") || pathname === "/i/courses" || pathname.startsWith("/i/lesson")]);
  }

  let items2 = [];
  if (hasPermission(user, PERMISSIONS.SUBMISSIONS_VIEW)) {
    items2.push(["/i/submissions/a1", "file", "ตรวจใบงาน", pathname.startsWith("/i/submissions") || pathname.startsWith("/i/grade")]);
  }
  if (hasPermission(user, PERMISSIONS.REPORTS_VIEW)) {
    items2.push(["/i/reports", "chart", "รายงาน / ส่งออก Excel", pathname.startsWith("/i/reports")]);
  }
  items2.push(["/i/ai-logs", "sparkle", "ประวัติการใช้งาน AI", pathname.startsWith("/i/ai-logs")]);
  
  let academicMasterItems = [];
  let studentMasterItems = [];
  let systemMasterItems = [];
  if (hasPermission(user, PERMISSIONS.MASTER_MANAGE)) {
    academicMasterItems.push(["/i/master/years", "cal", "ปีการศึกษา", pathname === "/i/master/years" || (pathname === "/i/master" && tab === "years")]);
    academicMasterItems.push(["/i/master/terms", "layers", "ภาคเรียน", pathname === "/i/master/terms"]);
    academicMasterItems.push(["/i/master/groups", "folder", "กลุ่มวิชา", pathname === "/i/master/groups"]);
    studentMasterItems.push(["/i/master/sections", "users", "Section / กลุ่มเรียน", pathname === "/i/master/sections"]);
    studentMasterItems.push(["/i/master/studentgrade", "award", "กำหนดชั้นปีนักศึกษา", pathname === "/i/master/studentgrade"]);
    systemMasterItems.push(["/i/master/ai-persona", "settings", "กำหนด Persona AI", pathname === "/i/master/ai-persona"]);
  }
  
  if (hasPermission(user, PERMISSIONS.USERS_MANAGE)) {
    systemMasterItems.push(["/i/master/users", "user", "จัดการผู้ใช้งาน", pathname === "/i/master/users"]);
    systemMasterItems.push(["/i/master/roles", "shield", "จัดการสิทธิ์ (Roles)", pathname === "/i/master/roles"]);
  }
  if (hasPermission(user, PERMISSIONS.BROADCASTS_MANAGE)) {
    systemMasterItems.push(["/i/master/broadcasts", "bell", "ประกาศ (Broadcasts)", pathname === "/i/master/broadcasts"]);
  }

  const Item = ([to, ic, label, active]) => (
    <Link href={to} key={to + label} className={"sb-item" + (active ? " on" : "")} style={{ textDecoration: 'none' }} onClick={onClose}>
      <Icon name={ic} size={18} className="ic" />{label}
    </Link>
  );

  return (
    <div className={`sidebar app-scroll ${open ? "open" : ""}`}>
      <div className="flex items-center justify-between" style={{ padding: "0 0 14px" }}>
        <Link href="/i/courses" className="logo pointer" style={{ textDecoration: 'none', padding: "6px 8px" }} onClick={onClose}>
          <span className="mark"><Icon name="grad" size={17} /></span>
          <div>E-learning<small>พื้นที่อาจารย์ผู้สอน</small></div>
        </Link>
        <button 
          className="iconbtn ghost sidebar-close-btn" 
          onClick={onClose}
          style={{ width: 32, height: 32, marginRight: 8 }}
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      {hasPermission(user, PERMISSIONS.COURSES_CREATE) && (
        <Link href="/i/course/new" className="btn btn-primary btn-block" style={{ margin: "0 2px 6px", textDecoration: 'none' }} onClick={onClose}>
          <Icon name="plus" size={16} />สร้างรายวิชา
        </Link>
      )}
      
      {items1.length > 0 && <div className="sb-label">การสอน</div>}
      {items1.map(Item)}
      
      {items2.length > 0 && <div className="sb-label">งานและคะแนน</div>}
      {items2.map(Item)}
      
      {academicMasterItems.length > 0 && <div className="sb-label">ข้อมูลหลักสูตร (Academic Data)</div>}
      {academicMasterItems.map(Item)}

      {studentMasterItems.length > 0 && <div className="sb-label">กลุ่มเรียนและชั้นปี (Student Data)</div>}
      {studentMasterItems.map(Item)}

      {systemMasterItems.length > 0 && <div className="sb-label">จัดการระบบ (System Settings)</div>}
      {systemMasterItems.map(Item)}
      
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

export default function InstructorSidebar({ open, onClose }) {
  return (
    <Suspense fallback={<div className={`sidebar app-scroll ${open ? "open" : ""}`} />}>
      <InstructorSidebarContent open={open} onClose={onClose} />
    </Suspense>
  );
}
