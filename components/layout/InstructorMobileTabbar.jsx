"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

function MoreSheet({ onClose }) {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  const roleLabels = {
    admin: "ผู้ดูแลระบบ",
    instructor: "อาจารย์ผู้สอน",
    student: "นักศึกษา",
  };
  const displayRole = roleLabels[session?.user?.role] || "อาจารย์ผู้สอน";

  const masterItems = [
    ["/i/master/years", "cal", "ปีการศึกษา"],
    ["/i/master/terms", "layers", "ภาคเรียน"],
    ["/i/master/groups", "folder", "กลุ่มวิชา"],
    ["/i/master/sections", "users", "Section / กลุ่มเรียน"],
    ["/i/master/users", "user", "จัดการผู้ใช้งาน"],
    ["/i/master/studentgrade", "award", "กำหนดชั้นปีนักศึกษา"],
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(11,46,58,.45)",
          backdropFilter: "blur(2px)", zIndex: 110, animation: "fade .15s ease"
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 120,
        background: "var(--card)", borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 32px rgba(11,46,58,.18)",
        animation: "slideUp .22s cubic-bezier(.2,.8,.3,1)",
        paddingBottom: "env(safe-area-inset-bottom)"
      }}>
        <style>{`
          @keyframes slideUp { from { transform: translateY(60px); opacity: 0; } }
        `}</style>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--border-strong)" }} />
        </div>

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <Avatar name={session?.user?.name || "อาจารย์"} src={session?.user?.image} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user?.name || "อ. ดร. สุภาวดี ทองคำ"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-fg)" }}>{displayRole}</div>
          </div>
        </div>

        {/* New course shortcut */}
        <div style={{ padding: "14px 16px 8px" }}>
          <Link
            href="/i/course/new"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--primary)", color: "#fff",
              borderRadius: 12, padding: "11px 16px",
              fontWeight: 600, fontSize: 14, textDecoration: "none"
            }}
          >
            <Icon name="plus" size={18} />
            สร้างรายวิชาใหม่
          </Link>
        </div>

        {/* Master data section */}
        <div style={{ padding: "4px 16px 8px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--subtle)", textTransform: "uppercase", letterSpacing: ".5px", padding: "8px 4px 6px" }}>
            ข้อมูลหลัก (Master)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {masterItems.map(([to, ic, label]) => (
              <Link
                key={to}
                href={to}
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 12px", borderRadius: 10,
                  background: pathname.startsWith(to) ? "var(--primary-soft)" : "var(--muted)",
                  color: pathname.startsWith(to) ? "var(--primary)" : "var(--fg)",
                  fontWeight: 500, fontSize: 13, textDecoration: "none"
                }}
              >
                <Icon name={ic} size={16} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid var(--border)", marginTop: 8 }}>
          <button
            onClick={() => { onClose(); signOut({ callbackUrl: "/login" }); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              background: "var(--danger-soft)", color: "var(--danger)",
              border: 0, borderRadius: 10, padding: "11px 16px",
              fontWeight: 600, fontSize: 14, cursor: "pointer", marginTop: 8
            }}
          >
            <Icon name="logout" size={18} />
            ออกจากระบบ
          </button>
        </div>
      </div>
    </>
  );
}

export default function InstructorMobileTabbar() {
  const pathname = usePathname() || "";
  const [showMore, setShowMore] = useState(false);

  const onHome = pathname === "/i/courses" || pathname.startsWith("/i/course") || pathname.startsWith("/i/lesson");
  const onSubmissions = pathname.startsWith("/i/submissions") || pathname.startsWith("/i/grade");
  const onReports = pathname.startsWith("/i/reports");
  const onMaster = pathname.startsWith("/i/master");

  const TabItem = ({ href, icon, label, active, onClick }) => (
    <Link
      href={href || "#"}
      className={active ? "on" : ""}
      onClick={onClick}
      style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, fontSize: 10.5, fontWeight: 500, color: active ? "var(--primary)" : "var(--subtle)", transition: ".12s" }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center",
        background: active ? "var(--primary-soft)" : "transparent",
        transition: ".12s"
      }}>
        <Icon name={icon} size={20} />
      </div>
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      {showMore && <MoreSheet onClose={() => setShowMore(false)} />}

      <div className="tabbar i-tabbar" style={{ background: "rgba(255,255,255,.95)", backdropFilter: "saturate(1.4) blur(12px)" }}>
        <TabItem href="/i/courses" icon="grid" label="รายวิชา" active={onHome} />
        <TabItem href="/i/submissions/a1" icon="file" label="ตรวจงาน" active={onSubmissions} />
        <TabItem href="/i/reports" icon="chart" label="รายงาน" active={onReports} />
        {/* "More" button – not a Link */}
        <button
          onClick={() => setShowMore(true)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, fontSize: 10.5, fontWeight: 500,
            color: onMaster ? "var(--primary)" : "var(--subtle)",
            background: "transparent", border: 0, cursor: "pointer", transition: ".12s"
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center",
            background: onMaster ? "var(--primary-soft)" : "transparent", transition: ".12s"
          }}>
            <Icon name="menu" size={20} />
          </div>
          <span>เพิ่มเติม</span>
        </button>
      </div>
    </>
  );
}
