"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { PageHead, Crumb } from "@/components/ui/Shared";

function ToggleRow({ label, on }) {
  const [v, setV] = React.useState(on);
  return (
    <div className="flex items-center justify-between" style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
      <span className="t-sm pretty" style={{ paddingRight: 12 }}>{label}</span>
      <button onClick={() => setV(!v)} style={{ width: 40, height: 23, borderRadius: 99, border: 0, cursor: "pointer", padding: 2, background: v ? "var(--primary)" : "#cbd5e1", transition: ".15s", flex: "0 0 40px" }}>
        <span style={{ display: "block", width: 19, height: 19, borderRadius: 99, background: "#fff", transform: v ? "translateX(17px)" : "translateX(0)", transition: ".15s" }} />
      </button>
    </div>
  );
}

export default function CreateCourse() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const toast = (msg) => alert(msg);

  const COLORS = ["#0d6e8c", "#1e5fa8", "#2f7d5b", "#5b4b9e", "#b4530b", "#0b1220"];
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]);
  const [term, setTerm] = React.useState("ภาคต้น 2568");

  const create = () => { toast("สร้างรายวิชาเรียบร้อยแล้ว"); setTimeout(() => nav("/i/courses"), 700); };

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: "สร้างรายวิชาใหม่" }]} />
      <PageHead kicker="พื้นที่อาจารย์ผู้สอน" title="สร้างรายวิชาใหม่"
        desc="กรอกข้อมูลพื้นฐานของรายวิชา จากนั้นจึงเพิ่มบทเรียน วิดีโอ และแบบทดสอบได้" />

      <div className="flex gap-5 items-start">
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="card mb-4">
            <div className="card-h"><div className="title">ข้อมูลรายวิชา</div></div>
            <div className="card-p">
              <div className="field">
                <label className="label">ชื่อรายวิชา <span className="c-danger">*</span></label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น การพยาบาลผู้ใหญ่ 1" />
              </div>
              <div className="grid grid-2 gap-3">
                <div className="field"><label className="label">รหัสวิชา <span className="c-danger">*</span></label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น NUR301" /></div>
                <div className="field"><label className="label">ภาคเรียน</label>
                  <select className="input" value={term} onChange={(e) => setTerm(e.target.value)}><option>ภาคต้น 2568</option><option>ภาคปลาย 2568</option><option>ภาคฤดูร้อน 2568</option></select>
                </div>
              </div>
              <div className="field">
                <label className="label">คำอธิบายรายวิชา</label>
                <textarea className="input" rows={3} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="สรุปขอบเขตเนื้อหาและจุดเน้นของรายวิชา…" />
              </div>
              <div className="grid grid-2 gap-3">
                <div className="field" style={{ margin: 0 }}><label className="label">อาจารย์ผู้สอน</label><input className="input" defaultValue="อ. ดร. สุภาวดี ทองคำ" /></div>
                <div className="field" style={{ margin: 0 }}><label className="label">หน่วยกิต</label><input className="input" defaultValue="3 (2-2-5)" /></div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-h"><div className="title">สีปกรายวิชา</div><div className="desc">ใช้แสดงบนการ์ดรายวิชาและหัวบทเรียน</div></div>
            <div className="card-p flex gap-3 wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 46, height: 46, borderRadius: 12, background: c, cursor: "pointer", border: "3px solid " + (color === c ? "var(--fg)" : "transparent"), boxShadow: "var(--shadow-xs)", display: "grid", placeItems: "center", color: "#fff" }}>
                  {color === c && <Icon name="check" size={18} />}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><div className="title">การลงทะเบียน</div></div>
            <div className="card-p">
              <ToggleRow label="เปิดให้นักศึกษาเข้าร่วมด้วยรหัสรายวิชา" on={true} />
              <ToggleRow label="ต้องอนุมัติก่อนเข้าร่วม" on={false} />
              <ToggleRow label="เผยแพร่ทันทีหลังสร้าง" on={false} />
            </div>
          </div>
        </div>

        {/* live preview + actions */}
        <div style={{ width: 312, flex: "0 0 312px", position: "sticky", top: 18 }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div className="card-h"><div className="title t-sm">ตัวอย่างการ์ดรายวิชา</div></div>
            <div className="card-p">
              <div className="card" style={{ overflow: "hidden" }}>
                <div style={{ height: 64, background: `linear-gradient(120deg, ${color}, ${color}cc)`, display: "flex", alignItems: "center", padding: "0 16px" }}>
                  <span className="badge" style={{ background: "rgba(255,255,255,.22)", color: "#fff", fontWeight: 700 }}>{code || "รหัสวิชา"}</span>
                </div>
                <div className="card-p" style={{ padding: 16 }}>
                  <div className="fw-7">{title || "ชื่อรายวิชา"}</div>
                  <div className="t-xs muted mt-1 pretty" style={{ minHeight: 30 }}>{subtitle || "คำอธิบายรายวิชาจะแสดงที่นี่"}</div>
                  <div className="flex items-center gap-2 mt-2 t-xs muted"><Icon name="user" size={13} />อ. ดร. สุภาวดี ทองคำ</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex col gap-2 mt-4">
            <button className="btn btn-primary btn-lg btn-block" disabled={!title || !code} onClick={create}><Icon name="plus" size={17} />สร้างรายวิชา</button>
            <button className="btn btn-outline btn-block" onClick={() => nav("/i/courses")}>ยกเลิก</button>
          </div>
          <div className="t-xs muted center mt-2">หลังสร้างแล้ว คุณจะเพิ่มบทเรียนและแบบทดสอบได้</div>
        </div>
      </div>
    </div>
  );
}
