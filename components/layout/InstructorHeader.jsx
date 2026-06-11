"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

export default function InstructorHeader() {
  const { data: session } = useSession();
  const roleLabels = {
    admin: "ผู้ดูแลระบบ",
    instructor: "อาจารย์ผู้สอน",
    student: "นักศึกษา",
  };
  const displayRole = roleLabels[session?.user?.role] || session?.user?.role || "อาจารย์ผู้สอน";
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
    <div className="topnav" style={{ borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.82)", backdropFilter: "saturate(1.4) blur(10px)", position: "sticky", top: 0, zIndex: 30, height: 64, display: "flex", alignItems: "center", padding: "0 30px" }}>
      <div className="flex-1">
        <div className="rel" style={{ width: 280 }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 11, top: 10, color: "var(--subtle)" }} />
          <input className="input" style={{ width: "100%", paddingLeft: 34, height: 38 }} placeholder="ค้นหารายวิชา, นักศึกษา…" />
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="iconbtn ghost"><Icon name="bell" size={18} /></button>
        <button className="iconbtn ghost"><Icon name="settings" size={18} /></button>
        <div className="divider" style={{ width: 1, height: 24, margin: "0 4px" }} />
        
        <div className="rel" ref={menuRef}>
          <div className="flex items-center gap-2 pointer" onClick={() => setMenuOpen(!menuOpen)} style={{ padding: "4px 8px", borderRadius: 8, transition: ".15s", background: menuOpen ? "var(--muted)" : "transparent" }}>
            <Avatar name={session?.user?.name || "อาจารย์"} src={session?.user?.image} size={32} />
            <Icon name="chevD" size={14} className="muted" />
          </div>

          {menuOpen && (
            <div className="card shadow" style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 200, zIndex: 100, padding: 8 }}>
              <div className="p-2" style={{ borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
                <div className="t-sm fw-6 truncate">{session?.user?.name || "อ. ดร. สุภาวดี ทองคำ"}</div>
                <div className="t-xs muted">{displayRole}</div>
              </div>
              <button className="flex items-center gap-3 p-2 pointer w-full" style={{ borderRadius: 8, background: "transparent", border: 0, textAlign: "left", color: "var(--danger)" }} onClick={() => signOut({ callbackUrl: "/login" })}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="x" size={14} /></div>
                <div className="t-sm fw-6">ออกจากระบบ</div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
