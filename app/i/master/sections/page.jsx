"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";

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

function SectionDialog({ mode, row, onClose, onSave }) {
  const [name, setName] = React.useState(row ? row.name : "");
  const [status, setStatus] = React.useState(row ? row.status : "active");
  const [rangeStart, setRangeStart] = React.useState(row ? row.range_start || "" : "");
  const [rangeEnd, setRangeEnd] = React.useState(row ? row.range_end || "" : "");

  const handleSave = () => {
    if (!name) { toast("กรุณากรอกชื่อ Section"); return; }
    if ((rangeStart && !rangeEnd) || (!rangeStart && rangeEnd)) {
      toast("กรุณาระบุรหัสเริ่มต้นและรหัสสิ้นสุดให้ครบทั้งคู่");
      return;
    }
    if (rangeStart && rangeEnd) {
      if (rangeStart.length !== 3 || rangeEnd.length !== 3) {
        toast("รหัสนักศึกษาช่วงเริ่มต้นและสิ้นสุดต้องมี 3 หลัก");
        return;
      }
      if (parseInt(rangeStart, 10) > parseInt(rangeEnd, 10)) {
        toast("รหัสเริ่มต้นต้องไม่มากกว่ารหัสสิ้นสุด");
        return;
      }
    }
    onSave({ 
      name, 
      students: row ? row.students || 0 : 0, 
      status,
      range_start: rangeStart || null,
      range_end: rangeEnd || null
    });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่ม Section" : "แก้ไข Section"} desc="กลุ่มเรียนของนักศึกษาในระบบ" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field mb-3">
        <label className="label">ชื่อ Section <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Sec 1, Sec A" />
      </div>
      
      <div className="grid grid-2 gap-3 mb-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label className="label">ช่วงรหัสเริ่มต้น (3 หลักท้าย)</label>
          <input className="input text-center" value={rangeStart} maxLength={3} onChange={(e) => setRangeStart(e.target.value.replace(/\D/g, ''))} placeholder="เช่น 001" />
        </div>
        <div className="field">
          <label className="label">ช่วงรหัสสิ้นสุด (3 หลักท้าย)</label>
          <input className="input text-center" value={rangeEnd} maxLength={3} onChange={(e) => setRangeEnd(e.target.value.replace(/\D/g, ''))} placeholder="เช่น 099" />
        </div>
      </div>

      <div className="field mb-3">
        <label className="label">สถานะ</label>
        <div className="flex gap-2">
          {[["active", "ใช้งาน"], ["archived", "เก็บถาวร"]].map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)} className="flex-1 btn btn-sm" style={{ border: "1px solid " + (status === k ? "var(--primary)" : "var(--border-strong)"), background: status === k ? "var(--primary-soft)" : "#fff", color: status === k ? "var(--primary-soft-fg)" : "var(--fg)" }}>{l}</button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

function ConfirmDialog({ title, desc, onConfirm, onClose }) {
  return (
    <Dialog title={title} desc={desc} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn" style={{ background: "var(--danger)", color: "#fff" }} onClick={() => { onConfirm(); onClose(); }}><Icon name="trash" size={15} />ลบข้อมูล</button></>}>
      <div className="flex items-center gap-3 p-2" style={{ background: "var(--danger-soft, #fff1f0)", borderRadius: 10 }}>
        <span style={{ fontSize: 28 }}>⚠️</span>
        <span className="t-sm pretty" style={{ color: "var(--danger)" }}>การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณาตรวจสอบให้แน่ใจก่อนดำเนินการต่อ</span>
      </div>
    </Dialog>
  );
}

const getStudentSectionName = (studentNo, defaultSection, sectionsList) => {
  if (!studentNo || !sectionsList || sectionsList.length === 0) return defaultSection || "-";
  const snoStr = String(studentNo).trim();
  if (snoStr.length < 3) return defaultSection || "-";
  const last3 = parseInt(snoStr.slice(-3), 10);
  if (isNaN(last3)) return defaultSection || "-";
  
  for (const s of sectionsList) {
    if (s.range_start && s.range_end) {
      const start = parseInt(s.range_start, 10);
      const end = parseInt(s.range_end, 10);
      if (!isNaN(start) && !isNaN(end)) {
        if (last3 >= start && last3 <= end) {
          return s.name;
        }
      }
    }
  }
  return defaultSection || "-";
};

export default function MasterSectionsPage() {
  const [sectionList, setSectionList] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}

  const loadData = async () => {
    setLoading(true);
    const [secRes, uRes] = await Promise.all([
      supabase.from("sections").select("*"),
      supabase.from("users").select("student_no, section").eq("role", "student")
    ]);
    if (!secRes.error) setSectionList(secRes.data || []);
    if (!uRes.error) setStudents(uRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSection = async (updatedSection) => {
    setDlg(null);
    if (dlg.mode === "add") {
      const obj = { id: "s_" + Date.now(), ...updatedSection };
      const { error } = await supabase.from("sections").insert([obj]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการสร้าง Section: " + error.message);
      } else {
        setSectionList(prev => [...prev, obj]);
        toast("เพิ่ม Section เรียบร้อยแล้ว");
        loadData();
      }
    } else {
      const { error } = await supabase.from("sections").update(updatedSection).eq("id", dlg.row.id);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไข Section: " + error.message);
      } else {
        setSectionList(prev => prev.map(s => s.id === dlg.row.id ? { ...s, ...updatedSection } : s));
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
        loadData();
      }
    }
  };

  const handleDeleteSection = async (id) => {
    const { error } = await supabase.from("sections").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาดในการลบ Section: " + error.message);
    } else {
      setSectionList(prev => prev.filter(s => s.id !== id));
      toast("ลบ Section เรียบร้อยแล้ว");
      loadData();
    }
  };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="Section / กลุ่มเรียน"
        desc="จัดการข้อมูลห้องเรียนและกลุ่มเรียนของนักศึกษา" />

      <Table
        title="Section / กลุ่มเรียน"
        description="กลุ่มเรียนของนักศึกษาในระบบ"
        addButton={
          <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}>
            <Icon name="plus" size={15} />เพิ่ม Section
          </button>
        }
        loading={loading}
        className="table"
        headers={["Section", "ช่วงรหัสนักศึกษา (3 ตัวท้าย)", "จำนวนนักศึกษา", "สถานะ", ""]}
        data={sectionList}
        colSpan={5}
        renderRow={(s) => {
          const count = students.filter(student => {
            const secName = getStudentSectionName(student.student_no, student.section, sectionList);
            return secName === s.name;
          }).length;

          return (
            <tr key={s.id}>
              <td><Badge tone="primary">{s.name}</Badge></td>
              <td>{s.range_start && s.range_end ? `${s.range_start}–${s.range_end}` : <span className="muted">—</span>}</td>
              <td className="num">{count}</td>
              <td>{mStatus(s.status)}</td>
              <td>
                <RowActions
                  onEdit={() => setDlg({ mode: "edit", row: s })}
                  onDelete={() => {
                    setConfirmDlg({
                      title: "ลบ Section",
                      desc: `คุณต้องการลบ "${s.name}" หรือไม่?`,
                      onConfirm: () => handleDeleteSection(s.id)
                    });
                  }}
                />
              </td>
            </tr>
          );
        }}
      />

      {dlg && <SectionDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={handleSaveSection} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
