"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge, Avatar, Dialog } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";

function mStatus(s) {
  const m = { active: ["success", "ใช้งาน"], archived: ["muted", "เก็บถาวร"], upcoming: ["info", "กำลังจะมาถึง"] };
  const [tone, label] = m[s] || ["muted", s];
  return <Badge tone={tone} dot>{label}</Badge>;
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="iconbtn ghost" onClick={onEdit}><Icon name="pencil" size={15} /></button>
      <button className="iconbtn ghost c-danger" onClick={onDelete}><Icon name="trash" size={15} /></button>
    </div>
  );
}

function YearDialog({ mode, row, onClose, onSave }) {
  const [year, setYear] = React.useState(row ? row.year : "");
  const [status, setStatus] = React.useState(row ? row.status : "upcoming");
  return (
    <Dialog title={mode === "add" ? "เพิ่มปีการศึกษา" : "แก้ไขปีการศึกษา"} desc="กำหนดปีการศึกษาและช่วงเวลาเปิด-ปิด" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={onSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field"><label className="label">ปีการศึกษา (พ.ศ.) <span className="c-danger">*</span></label><input className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="เช่น 2569" /></div>
      <div className="grid grid-2 gap-3">
        <div className="field"><label className="label">วันเริ่มต้น</label><input className="input" defaultValue={row ? row.start : ""} placeholder="1 มิ.ย. 2569" /></div>
        <div className="field"><label className="label">วันสิ้นสุด</label><input className="input" defaultValue={row ? row.end : ""} placeholder="31 พ.ค. 2570" /></div>
      </div>
      <label className="label">สถานะ</label>
      <div className="flex gap-2">
        {[["active", "ใช้งาน (ปัจจุบัน)"], ["upcoming", "กำลังจะมาถึง"], ["archived", "เก็บถาวร"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className="flex-1 btn btn-sm" style={{ border: "1px solid " + (status === k ? "var(--primary)" : "var(--border-strong)"), background: status === k ? "var(--primary-soft)" : "#fff", color: status === k ? "var(--primary-soft-fg)" : "var(--fg)" }}>{l}</button>
        ))}
      </div>
    </Dialog>
  );
}

function GenericDialog({ title, mode, onClose, onSave }) {
  return (
    <Dialog title={mode === "add" ? title : "แก้ไขข้อมูล"} desc="กรอกรายละเอียดข้อมูลหลัก" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={onSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field"><label className="label">ชื่อ <span className="c-danger">*</span></label><input className="input" placeholder="กรอกชื่อ…" /></div>
      <div className="field"><label className="label">รายละเอียด</label><input className="input" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" /></div>
    </Dialog>
  );
}

export default function MasterData() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const toast = (msg) => alert(msg);

  const [tab, setTab] = React.useState("years");
  const [dlg, setDlg] = React.useState(null); // {mode, row}
  const D = DATA;

  const tabs = [
    ["years", "ปีการศึกษา", "cal"],
    ["terms", "ภาคเรียน", "layers"],
    ["groups", "กลุ่มวิชา", "folder"],
    ["sections", "Section / กลุ่มเรียน", "users"],
  ];
  const meta = {
    years: { title: "ปีการศึกษา", add: "เพิ่มปีการศึกษา", desc: "กำหนดปีการศึกษาและช่วงเวลา ปีที่ตั้งเป็น “ใช้งาน” จะเป็นค่าเริ่มต้นของระบบ" },
    terms: { title: "ภาคเรียน", add: "เพิ่มภาคเรียน", desc: "ภาคการศึกษาภายใต้แต่ละปีการศึกษา" },
    groups: { title: "กลุ่มวิชา", add: "เพิ่มกลุ่มวิชา", desc: "กลุ่มสาขาวิชาและหัวหน้ากลุ่มผู้รับผิดชอบ" },
    sections: { title: "Section / กลุ่มเรียน", add: "เพิ่ม Section", desc: "กลุ่มเรียนของนักศึกษาในแต่ละกลุ่มวิชา" },
  }[tab];

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="จัดการข้อมูลหลัก"
        desc="ตั้งค่าข้อมูลพื้นฐานของระบบที่ใช้ร่วมกันทุกรายวิชา" />

      <div className="flex gap-5 items-start">
        {/* left nav */}
        <div style={{ width: 220, flex: "0 0 220px" }} className="hide-m">
          <div className="card" style={{ padding: 8 }}>
            {tabs.map(([k, t, ic]) => (
              <div key={k} className={"sb-item" + (tab === k ? " on" : "")} onClick={() => setTab(k)}><Icon name={ic} size={17} className="ic" />{t}</div>
            ))}
          </div>
        </div>

        <div className="flex-1" style={{ minWidth: 0 }}>
          {/* mobile/inline tabs fallback */}
          <div className="tabs pill mb-4 only-m" style={{ display: "none" }} />
          <div className="card">
            <div className="card-h flex items-center justify-between">
              <div><div className="title">{meta.title}</div><div className="desc pretty">{meta.desc}</div></div>
              <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}><Icon name="plus" size={15} />{meta.add}</button>
            </div>

            {tab === "years" && (
              <table className="table">
                <thead><tr><th>ปีการศึกษา</th><th>เริ่ม</th><th>สิ้นสุด</th><th>รายวิชา</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.academicYears.map((y) => (
                    <tr key={y.id}>
                      <td><div className="flex items-center gap-2"><div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="cal" size={16} /></div><span className="fw-6">{y.label}</span></div></td>
                      <td className="muted t-sm">{y.start}</td>
                      <td className="muted t-sm">{y.end}</td>
                      <td className="num">{y.courses}</td>
                      <td>{mStatus(y.status)}</td>
                      <td><RowActions onEdit={() => setDlg({ mode: "edit", row: y })} onDelete={() => toast("ลบปีการศึกษาแล้ว")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "terms" && (
              <table className="table">
                <thead><tr><th>ภาคเรียน</th><th>ปีการศึกษา</th><th>เริ่ม</th><th>สิ้นสุด</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.terms.map((t) => (
                    <tr key={t.id}><td className="fw-6">{t.name}</td><td className="t-sm">{t.year}</td><td className="muted t-sm">{t.start}</td><td className="muted t-sm">{t.end}</td><td>{mStatus(t.status)}</td><td><RowActions onEdit={() => setDlg({ mode: "edit", row: t })} onDelete={() => toast("ลบภาคเรียนแล้ว")} /></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "groups" && (
              <table className="table">
                <thead><tr><th>กลุ่มวิชา</th><th>หัวหน้ากลุ่ม</th><th>รายวิชา</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.subjectGroups.map((g) => (
                    <tr key={g.id}><td className="fw-6">{g.name}</td><td className="t-sm flex items-center gap-2"><Avatar name={g.head.replace(/^อ\. (ดร\. )?/, "")} size={24} />{g.head}</td><td className="num">{g.courses}</td><td>{mStatus(g.status)}</td><td><RowActions onEdit={() => setDlg({ mode: "edit", row: g })} onDelete={() => toast("ลบกลุ่มวิชาแล้ว")} /></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "sections" && (
              <table className="table">
                <thead><tr><th>Section</th><th>กลุ่มวิชา</th><th>จำนวนนักศึกษา</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.sectionList.map((s) => (
                    <tr key={s.id}><td><Badge tone="primary">{s.name}</Badge></td><td className="t-sm">{s.group}</td><td className="num">{s.students}</td><td>{mStatus(s.status)}</td><td><RowActions onEdit={() => setDlg({ mode: "edit", row: s })} onDelete={() => toast("ลบ Section แล้ว")} /></td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {dlg && tab === "years" && <YearDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={() => { setDlg(null); toast(dlg.mode === "add" ? "เพิ่มปีการศึกษาแล้ว" : "บันทึกการแก้ไขแล้ว"); }} />}
      {dlg && tab !== "years" && <GenericDialog title={meta.add} mode={dlg.mode} onClose={() => setDlg(null)} onSave={() => { setDlg(null); toast("บันทึกข้อมูลแล้ว"); }} />}
    </div>
  );
}
