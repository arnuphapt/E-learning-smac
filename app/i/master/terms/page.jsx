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

function parseThaiDateToISO(thaiDateStr) {
  if (!thaiDateStr) return "";
  const parts = thaiDateStr.split(" ");
  if (parts.length !== 3) return "";
  
  const day = parts[0].padStart(2, "0");
  const monthStr = parts[1];
  const yearBE = parseInt(parts[2], 10);
  const yearCE = yearBE - 543;
  
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const monthIdx = thaiMonths.indexOf(monthStr);
  if (monthIdx === -1) return "";
  
  const month = String(monthIdx + 1).padStart(2, "0");
  return `${yearCE}-${month}-${day}`;
}

function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const thaiYear = year + 543;
  
  return `${day} ${thaiMonths[month - 1]} ${thaiYear}`;
}

function TermDialog({ mode, row, academicYears, onClose, onSave }) {
  const [name, setName] = React.useState(row ? row.name : "ภาคเรียนที่ 1");
  const [year, setYear] = React.useState(row ? String(row.year) : (academicYears?.[0]?.year || ""));
  const [startDate, setStartDate] = React.useState(row ? parseThaiDateToISO(row.start_date) : "");
  const [endDate, setEndDate] = React.useState(row ? parseThaiDateToISO(row.end_date) : "");
  const [status, setStatus] = React.useState(row ? row.status : "upcoming");

  const handleSave = () => {
    if (!year) {
      toast("กรุณาเลือกปีการศึกษา");
      return;
    }
    onSave({
      name,
      year,
      start_date: formatThaiDate(startDate),
      end_date: formatThaiDate(endDate),
      status
    });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่มภาคเรียน" : "แก้ไขภาคเรียน"} desc="ภาคการศึกษาภายใต้แต่ละปีการศึกษา" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชื่อภาคเรียน <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ภาคเรียนที่ 1" />
      </div>
      <div className="field">
        <label className="label">ปีการศึกษา <span className="c-danger">*</span></label>
        {academicYears && academicYears.length > 0 ? (
          <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
            {academicYears.map((ay) => (
              <option key={ay.id} value={String(ay.year)}>ปีการศึกษา {ay.year}</option>
            ))}
          </select>
        ) : (
          <select className="input" disabled>
            <option value="">— ยังไม่มีปีการศึกษา กรุณาเพิ่มก่อน —</option>
          </select>
        )}
      </div>
      <div className="grid grid-2 gap-3">
        <div className="field"><label className="label">วันเริ่มต้น</label><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="field"><label className="label">วันสิ้นสุด</label><input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
      </div>
      <label className="label">สถานะ</label>
      <div className="flex gap-2">
        {[["active", "ใช้งาน"], ["upcoming", "กำลังจะมาถึง"], ["archived", "เก็บถาวร"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className="flex-1 btn btn-sm" style={{ border: "1px solid " + (status === k ? "var(--primary)" : "var(--border-strong)"), background: status === k ? "var(--primary-soft)" : "#fff", color: status === k ? "var(--primary-soft-fg)" : "var(--fg)" }}>{l}</button>
        ))}
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

export default function MasterTermsPage() {
  const [terms, setTerms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}

  const loadData = async () => {
    setLoading(true);
    const [tRes, yRes] = await Promise.all([
      supabase.from("terms").select("*"),
      supabase.from("academic_years").select("*").order("year", { ascending: false })
    ]);
    if (!tRes.error) setTerms(tRes.data || []);
    if (!yRes.error) setAcademicYears(yRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTerm = async (updatedTerm) => {
    setDlg(null);
    if (dlg.mode === "add") {
      const obj = { id: "t_" + Date.now(), ...updatedTerm };
      const { error } = await supabase.from("terms").insert([obj]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการสร้างภาคเรียน: " + error.message);
      } else {
        setTerms(prev => [...prev, obj]);
        toast("เพิ่มภาคเรียนเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("terms").update(updatedTerm).eq("id", dlg.row.id);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไขภาคเรียน: " + error.message);
      } else {
        setTerms(prev => prev.map(t => t.id === dlg.row.id ? { ...t, ...updatedTerm } : t));
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleDeleteTerm = async (id) => {
    const { error } = await supabase.from("terms").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาดในการลบภาคเรียน: " + error.message);
    } else {
      setTerms(prev => prev.filter(t => t.id !== id));
      toast("ลบภาคเรียนเรียบร้อยแล้ว");
    }
  };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="ภาคเรียน"
        desc="จัดการภาคเรียนในแต่ละปีการศึกษา" />

      <Table
        title="ภาคเรียน"
        description="ภาคการศึกษาภายใต้แต่ละปีการศึกษา"
        addButton={
          <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}>
            <Icon name="plus" size={15} />เพิ่มภาคเรียน
          </button>
        }
        loading={loading}
        className="table"
            headers={["ภาคเรียน", "ปีการศึกษา", "เริ่ม", "สิ้นสุด", "สถานะ", ""]}
            data={terms}
            colSpan={6}
            renderRow={(t) => (
              <tr key={t.id}>
                <td className="fw-6">{t.name}</td>
                <td className="t-sm">ปีการศึกษา {t.year}</td>
                <td className="muted t-sm">{t.start_date}</td>
                <td className="muted t-sm">{t.end_date}</td>
                <td>{mStatus(t.status)}</td>
                <td>
                  <RowActions
                    onEdit={() => setDlg({ mode: "edit", row: t })}
                    onDelete={() => {
                      setConfirmDlg({
                        title: "ลบภาคเรียน",
                        desc: `คุณต้องการลบ "${t.name} ${t.year}" หรือไม่?`,
                        onConfirm: () => handleDeleteTerm(t.id)
                      });
                    }}
                  />
                </td>
              </tr>
            )}
          />

      {dlg && <TermDialog mode={dlg.mode} row={dlg.row} academicYears={academicYears} onClose={() => setDlg(null)} onSave={handleSaveTerm} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
