"use client";

import Icon from "../ui/Icon";
import { Avatar } from "../ui/Primitives";

export default function InstructorHeader() {
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
        <div className="flex items-center gap-2 pointer">
          <Avatar name="สุภาวดี" size={32} />
        </div>
      </div>
    </div>
  );
}
