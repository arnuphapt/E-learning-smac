"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

export default function InstructorSidebar() {
  const pathname = usePathname() || "";

  const items1 = [["/i/courses", "grid", "ภาพรวม / รายวิชา", pathname.startsWith("/i/course") || pathname === "/i/courses" || pathname.startsWith("/i/lesson")]];
  const items2 = [
    ["/i/submissions/a1", "file", "ตรวจใบงาน", pathname.startsWith("/i/submissions") || pathname.startsWith("/i/grade")],
    ["/i/reports", "chart", "รายงาน / ส่งออก Excel", pathname.startsWith("/i/reports")],
  ];
  const items3 = [
    ["/i/master", "settings", "ข้อมูลหลัก (Master)", pathname.startsWith("/i/master")],
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
        <div>NurseLearn<small>พื้นที่อาจารย์ผู้สอน</small></div>
      </Link>
      <Link href="/i/course/new" className="btn btn-primary btn-block" style={{ margin: "0 2px 6px", textDecoration: 'none' }}>
        <Icon name="plus" size={16} />สร้างรายวิชา
      </Link>
      
      <div className="sb-label">การสอน</div>
      {items1.map(Item)}
      
      <div className="sb-label">งานและคะแนน</div>
      {items2.map(Item)}
      
      <div className="sb-label">ตั้งค่าระบบ</div>
      {items3.map(Item)}
      
      <div className="sb-label">อื่นๆ</div>
      <Link href="/i/courses" className="sb-item" style={{ textDecoration: 'none' }}><Icon name="msg" size={18} className="ic" />ข้อความนักศึกษา</Link>
      <Link href="/i/courses" className="sb-item" style={{ textDecoration: 'none' }}><Icon name="settings" size={18} className="ic" />ตั้งค่า</Link>
      
      <div className="sb-foot">
        <Avatar name="สุภาวดี" size={36} />
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-sm fw-6 truncate">อ. ดร. สุภาวดี ทองคำ</div>
          <div className="t-xs muted">อาจารย์ผู้สอน</div>
        </div>
        <Link href="/" className="iconbtn ghost" title="ออกจากระบบ" style={{ textDecoration: 'none' }}>
          <Icon name="logout" size={17} />
        </Link>
      </div>
    </div>
  );
}
