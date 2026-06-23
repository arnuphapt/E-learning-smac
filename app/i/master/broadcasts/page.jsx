"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Table from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="iconbtn ghost" onClick={onEdit}><Icon name="pencil" size={15} /></button>
      <button className="iconbtn ghost c-danger" onClick={onDelete}><Icon name="trash" size={15} /></button>
    </div>
  );
}

function BroadcastDialog({ mode, row, masterYearLabels, onClose, onSave }) {
  const [title, setTitle] = useState(row?.title || "");
  const [body, setBody] = useState(row?.body || "");
  const [pinned, setPinned] = useState(row?.pinned || false);
  const [expiresAt, setExpiresAt] = useState(row?.expires_at ? row.expires_at.slice(0, 10) : "");
  const [editYearLevels, setEditYearLevels] = useState(
    (row?.year_level || []).map(y => typeof y === 'number' || !isNaN(Number(y)) ? `ชั้นปีที่ ${y}` : y)
  );

  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      toast("กรุณากรอกหัวข้อและเนื้อหาประกาศ");
      return;
    }
    const finalYearLevels = editYearLevels.map(y => {
      const parsed = parseInt(String(y).replace(/\D/g, ''), 10);
      return isNaN(parsed) ? null : parsed;
    }).filter(Boolean);

    onSave({ 
      title: title.trim(), 
      body: body.trim(), 
      pinned, 
      expires_at: expiresAt || null,
      year_level: finalYearLevels
    });
  };

  return (
    <Dialog
      title={mode === "add" ? "สร้างประกาศใหม่" : "แก้ไขประกาศ"}
      desc="ประกาศจะแสดงในหน้าของนักศึกษาตามชั้นปีที่กำหนด"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}><Icon name="send" size={15} />บันทึก</button>
        </>
      }
    >
      <div className="field">
        <label className="label">หัวข้อประกาศ <span className="c-danger">*</span></label>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น แจ้งปิดระบบชั่วคราว" />
      </div>
      <div className="field">
        <label className="label">เนื้อหา <span className="c-danger">*</span></label>
        <textarea
          className="input"
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={4}
          placeholder="รายละเอียดประกาศ..."
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Target Year Levels */}
      <div className="field mb-4">
        <label className="label">ชั้นปีที่ประกาศถึง <span className="t-xs muted fw-4">(ไม่เลือก = ทุกชั้นปี)</span></label>
        <div className="flex items-center gap-3 flex-wrap" style={{ paddingTop: 6 }}>
          {masterYearLabels.length === 0 ? (
            <span className="t-sm muted">กำลังโหลดข้อมูลชั้นปี...</span>
          ) : masterYearLabels.map((yrLabel) => {
            const numberMatch = parseInt(yrLabel.replace(/\D/g, ''));
            const checked = editYearLevels.includes(yrLabel) || (!isNaN(numberMatch) && editYearLevels.includes(numberMatch)) || editYearLevels.includes(String(numberMatch));
            
            return (
              <label key={yrLabel} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none",
                padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                background: checked ? "var(--primary-soft, #eef6ff)" : "var(--surface)", transition: ".15s", fontWeight: checked ? 700 : 400,
                color: checked ? "var(--primary)" : "var(--fg)" }}>
                <input type="checkbox" style={{ display: "none" }} checked={checked}
                  onChange={() => setEditYearLevels(prev => checked ? prev.filter(y => y !== yrLabel && (!isNaN(numberMatch) ? String(y) !== String(numberMatch) : true)) : [...prev, yrLabel].sort())} />
                <span style={{ width: 16, height: 16, borderRadius: 5, border: `2px solid ${checked ? "var(--primary)" : "var(--border-strong)"}`,
                  background: checked ? "var(--primary)" : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {checked && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </span>
                {yrLabel}
              </label>
            );
          })}
        </div>
        {editYearLevels.length === 0 && (
          <div className="t-xs muted mt-2" style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M10 9v5M10 7v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            นักศึกษาทุกชั้นปีจะมองเห็นประกาศนี้
          </div>
        )}
      </div>

      <div className="grid grid-2 gap-3">
        <div className="field">
          <label className="label">วันหมดอายุ (ไม่บังคับ)</label>
          <input className="input" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <div className="field" style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            <span className="t-sm fw-6">📌 ปักหมุด (แสดงก่อน)</span>
          </label>
        </div>
      </div>
    </Dialog>
  );
}

export default function BroadcastsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [masterYearLabels, setMasterYearLabels] = useState([]);
  const confirm = useConfirm();

  const canManage = hasPermission(session?.user, PERMISSIONS.BROADCASTS_MANAGE);

  const loadData = async () => {
    setLoading(true);
    const [bRes, sgRes] = await Promise.all([
      supabase
        .from("broadcasts")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("student_grades").select("prefix, year_label")
    ]);
    
    setData(bRes.data || []);
    
    if (sgRes?.data) {
      const uniqueYears = Array.from(new Set(sgRes.data.map(g => g.year_label).filter(Boolean))).sort();
      setMasterYearLabels(uniqueYears);
    }
    
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (values) => {
    try {
      if (dialog.mode === "add") {
        const { error } = await supabase.from("broadcasts").insert([{
          id: "b_" + Date.now(),
          ...values,
          created_by: session?.user?.id,
        }]);
        if (error) throw error;
        toast("สร้างประกาศเรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("broadcasts").update(values).eq("id", dialog.row.id);
        if (error) throw error;
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
      setDialog(null);
      loadData();
    } catch (e) {
      toast("เกิดข้อผิดพลาด: " + e.message, "error");
    }
  };

  const handleDelete = async (row) => {
    if (!(await confirm({
      title: "ลบประกาศ",
      message: `ลบประกาศ "${row.title}" ใช่หรือไม่?`,
      confirmText: "ลบ",
      danger: true,
    }))) return;
    const { error } = await supabase.from("broadcasts").delete().eq("id", row.id);
    if (error) { toast("ลบไม่สำเร็จ: " + error.message, "error"); return; }
    toast("ลบประกาศเรียบร้อยแล้ว");
    loadData();
  };

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="container">
      <PageHead
        kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)"
        title="ประกาศ (Broadcasts)"
        desc="สร้างและจัดการประกาศที่แสดงในหน้าของนักศึกษา"
      />

      <Table
        title="ประกาศทั้งหมด"
        description="ประกาศจะแสดงในปุ่มแมวที่มุมขวาล่างของนักศึกษา"
        addButton={
          canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => setDialog({ mode: "add" })}>
              <Icon name="plus" size={15} />สร้างประกาศ
            </button>
          )
        }
        loading={loading}
        className="table"
        headers={["หัวข้อ", "กลุ่มเป้าหมาย", "เนื้อหา", "หมดอายุ", "สถานะ", ""]}
        data={data}
        colSpan={6}
        renderRow={(row) => (
          <tr key={row.id}>
            <td>
              <div className="flex items-center gap-2">
                {row.pinned && <span>📌</span>}
                <span className="fw-6">{row.title}</span>
              </div>
              <div className="t-xs muted mt-1">{formatDate(row.created_at)}</div>
            </td>
            <td>
              {row.year_level && row.year_level.length > 0 ? (
                <div className="flex gap-1 flex-wrap">
                  {row.year_level.map(y => (
                    <Badge key={y} tone="primary">ปี {y}</Badge>
                  ))}
                </div>
              ) : (
                <span className="t-xs muted">ทุกชั้นปี</span>
              )}
            </td>
            <td>
              <div className="t-sm muted" style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.body}</div>
            </td>
            <td className="t-sm muted">{formatDate(row.expires_at)}</td>
            <td>
              {row.expires_at && new Date(row.expires_at) < new Date()
                ? <Badge tone="muted">หมดอายุ</Badge>
                : <Badge tone="success">ใช้งานอยู่</Badge>
              }
            </td>
            <td>
              {canManage && (
                <RowActions
                  onEdit={() => setDialog({ mode: "edit", row })}
                  onDelete={() => handleDelete(row)}
                />
              )}
            </td>
          </tr>
        )}
      />

      {dialog && (
        <BroadcastDialog
          mode={dialog.mode}
          row={dialog.row}
          masterYearLabels={masterYearLabels}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
