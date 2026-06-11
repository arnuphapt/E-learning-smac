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

function YearDialog({ mode, row, onClose, onSave }) {
  const currentBE = new Date().getFullYear() + 543;
  const [year, setYear] = React.useState(row ? row.year : String(currentBE));
  const [status, setStatus] = React.useState(row ? row.status : "upcoming");
  const [startDate, setStartDate] = React.useState(row ? parseThaiDateToISO(row.start_date) : "");
  const [endDate, setEndDate] = React.useState(row ? parseThaiDateToISO(row.end_date) : "");

  const yearsOptions = [];
  for (let i = currentBE - 5; i <= currentBE + 5; i++) {
    yearsOptions.push(i);
  }

  const handleSave = () => {
    if (!year) {
      toast("กรุณาเลือกปีการศึกษา");
      return;
    }
    onSave({
      year,
      label: `ปีการศึกษา ${year}`,
      start_date: formatThaiDate(startDate),
      end_date: formatThaiDate(endDate),
      status,
      courses: row ? row.courses || 0 : 0
    });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่มปีการศึกษา" : "แก้ไขปีการศึกษา"} desc="กำหนดปีการศึกษาและช่วงเวลาเปิด-ปิด" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ปีการศึกษา (พ.ศ.) <span className="c-danger">*</span></label>
        <select className="input" value={year} onChange={(e) => setYear(e.target.value)}>
          {yearsOptions.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
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

export default function MasterYearsPage() {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("academic_years")
      .select("*")
      .order("year", { ascending: false });
    if (!error) {
      setAcademicYears(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveYear = async (updatedYear) => {
    setDlg(null);
    if (dlg.mode === "add") {
      const newYearObj = {
        id: "y_" + Date.now(),
        ...updatedYear
      };
      const { error } = await supabase.from("academic_years").insert([newYearObj]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการสร้างปีการศึกษา: " + error.message);
      } else {
        setAcademicYears(prev => [newYearObj, ...prev].sort((a, b) => b.year.localeCompare(a.year)));
        toast("เพิ่มปีการศึกษาเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("academic_years").update(updatedYear).eq("id", dlg.row.id);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไขปีการศึกษา: " + error.message);
      } else {
        setAcademicYears(prev => prev.map(y => y.id === dlg.row.id ? { ...y, ...updatedYear } : y));
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleDeleteYear = async (id) => {
    const { error } = await supabase.from("academic_years").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาดในการลบปีการศึกษา: " + error.message);
    } else {
      setAcademicYears(prev => prev.filter(y => y.id !== id));
      toast("ลบปีการศึกษาเรียบร้อยแล้ว");
    }
  };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="ปีการศึกษา"
        desc="จัดการปีการศึกษาและช่วงเวลาเปิดเรียนในระบบ" />

      <div className="card">
        <div className="card-h flex items-center justify-between">
          <div>
            <div className="title">ปีการศึกษา</div>
            <div className="desc pretty">กำหนดปีการศึกษาและช่วงเวลา ปีที่ตั้งเป็น “ใช้งาน” จะเป็นค่าเริ่มต้นของระบบ</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}>
            <Icon name="plus" size={15} />เพิ่มปีการศึกษา
          </button>
        </div>

        {loading ? (
          <Loading className="p-5 text-center muted" />
        ) : (
          <Table
            className="table"
            headers={["ปีการศึกษา", "เริ่ม", "สิ้นสุด", "รายวิชา", "สถานะ", ""]}
            data={academicYears}
            colSpan={6}
            renderRow={(y) => (
              <tr key={y.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
                      <Icon name="cal" size={16} />
                    </div>
                    <span className="fw-6">{y.label}</span>
                  </div>
                </td>
                <td className="muted t-sm">{y.start_date}</td>
                <td className="muted t-sm">{y.end_date}</td>
                <td className="num">{y.courses || 0}</td>
                <td>{mStatus(y.status)}</td>
                <td>
                  <RowActions
                    onEdit={() => setDlg({ mode: "edit", row: y })}
                    onDelete={() => {
                      setConfirmDlg({
                        title: "ลบปีการศึกษา",
                        desc: `คุณต้องการลบ "${y.label}" หรือไม่?`,
                        onConfirm: () => handleDeleteYear(y.id)
                      });
                    }}
                  />
                </td>
              </tr>
            )}
          />
        )}
      </div>

      {dlg && <YearDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={handleSaveYear} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
