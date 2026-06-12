"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog, Avatar } from "@/components/ui/Primitives";
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

function GroupDialog({ mode, row, instructors, onClose, onSave }) {
  const [name, setName] = React.useState(row ? row.name : "");
  const [head, setHead] = React.useState(row ? row.head : (instructors?.[0]?.name || ""));
  const [status, setStatus] = React.useState(row ? row.status : "active");

  const handleSave = () => {
    if (!name) { toast("กรุณากรอกชื่อกลุ่มวิชา"); return; }
    onSave({ name, head, status, courses: row ? row.courses || 0 : 0 });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่มกลุ่มวิชา" : "แก้ไขกลุ่มวิชา"} desc="กลุ่มสาขาวิชาและหัวหน้ากลุ่มผู้รับผิดชอบ" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชื่อกลุ่มวิชา <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น วิทยาการคอมพิวเตอร์" />
      </div>
      <div className="field">
        <label className="label">หัวหน้ากลุ่มวิชา</label>
        {instructors && instructors.length > 0 ? (
          <select className="input" value={head} onChange={(e) => setHead(e.target.value)}>
            {instructors.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
          </select>
        ) : (
          <input className="input" value={head} onChange={(e) => setHead(e.target.value)} placeholder="ชื่ออาจารย์หัวหน้ากลุ่ม" />
        )}
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

export default function MasterGroupsPage() {
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}

  const loadData = async () => {
    setLoading(true);
    const [gRes, uRes] = await Promise.all([
      supabase.from("subject_groups").select("*"),
      supabase.from("users").select("*").in("role", ["instructor", "admin"])
    ]);
    if (!gRes.error) setSubjectGroups(gRes.data || []);
    if (!uRes.error) setInstructors(uRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveGroup = async (updatedGroup) => {
    setDlg(null);
    if (dlg.mode === "add") {
      const obj = { id: "g_" + Date.now(), ...updatedGroup };
      const { error } = await supabase.from("subject_groups").insert([obj]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการสร้างกลุ่มวิชา: " + error.message);
      } else {
        setSubjectGroups(prev => [...prev, obj]);
        toast("เพิ่มกลุ่มวิชาเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("subject_groups").update(updatedGroup).eq("id", dlg.row.id);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไขกลุ่มวิชา: " + error.message);
      } else {
        setSubjectGroups(prev => prev.map(g => g.id === dlg.row.id ? { ...g, ...updatedGroup } : g));
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleDeleteGroup = async (id) => {
    const { error } = await supabase.from("subject_groups").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาดในการลบกลุ่มวิชา: " + error.message);
    } else {
      setSubjectGroups(prev => prev.filter(g => g.id !== id));
      toast("ลบกลุ่มวิชาเรียบร้อยแล้ว");
    }
  };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="กลุ่มวิชา"
        desc="จัดการข้อมูลสาขาวิชาและคณาจารย์ผู้รับผิดชอบ" />

      <Table
        title="กลุ่มวิชา"
        description="กลุ่มสาขาวิชาและหัวหน้ากลุ่มผู้รับผิดชอบ"
        addButton={
          <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}>
            <Icon name="plus" size={15} />เพิ่มกลุ่มวิชา
          </button>
        }
        loading={loading}
        className="table"
            headers={["กลุ่มวิชา", "หัวหน้ากลุ่ม", "รายวิชา", "สถานะ", ""]}
            data={subjectGroups}
            colSpan={5}
            renderRow={(g) => (
              <tr key={g.id}>
                <td className="fw-6">{g.name}</td>
                <td className="t-sm flex items-center gap-2">
                  <Avatar name={g.head ? g.head.replace(/^อ\. (ดร\. )?/, "") : "?"} size={24} />
                  {g.head || "ไม่ระบุ"}
                </td>
                <td className="num">{g.courses || 0}</td>
                <td>{mStatus(g.status)}</td>
                <td>
                  <RowActions
                    onEdit={() => setDlg({ mode: "edit", row: g })}
                    onDelete={() => {
                      setConfirmDlg({
                        title: "ลบกลุ่มวิชา",
                        desc: `คุณต้องการลบ "${g.name}" หรือไม่?`,
                        onConfirm: () => handleDeleteGroup(g.id)
                      });
                    }}
                  />
                </td>
              </tr>
            )}
          />

      {dlg && <GroupDialog mode={dlg.mode} row={dlg.row} instructors={instructors} onClose={() => setDlg(null)} onSave={handleSaveGroup} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
