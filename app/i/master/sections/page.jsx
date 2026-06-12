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

  const handleSave = () => {
    if (!name) { toast("กรุณากรอกชื่อ Section"); return; }
    onSave({ name, students: row ? row.students || 0 : 0, status });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่ม Section" : "แก้ไข Section"} desc="กลุ่มเรียนของนักศึกษาในระบบ" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชื่อ Section <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น Sec 1, Sec A" />
      </div>
      <label className="label">สถานะ</label>
      <div className="flex gap-2">
        {[["active", "ใช้งาน"], ["archived", "เก็บถาวร"]].map(([k, l]) => (
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

export default function MasterSectionsPage() {
  const [sectionList, setSectionList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("sections").select("*");
    if (!error) setSectionList(data || []);
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
      }
    } else {
      const { error } = await supabase.from("sections").update(updatedSection).eq("id", dlg.row.id);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไข Section: " + error.message);
      } else {
        setSectionList(prev => prev.map(s => s.id === dlg.row.id ? { ...s, ...updatedSection } : s));
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
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
            headers={["Section", "จำนวนนักศึกษา", "สถานะ", ""]}
            data={sectionList}
            colSpan={4}
            renderRow={(s) => (
              <tr key={s.id}>
                <td><Badge tone="primary">{s.name}</Badge></td>
                <td className="num">{s.students || 0}</td>
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
            )}
          />

      {dlg && <SectionDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={handleSaveSection} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
