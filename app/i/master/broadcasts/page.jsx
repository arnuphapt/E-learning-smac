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

function BroadcastDialog({ mode, row, onClose, onSave }) {
  const [title, setTitle] = useState(row?.title || "");
  const [body, setBody] = useState(row?.body || "");
  const [pinned, setPinned] = useState(row?.pinned || false);
  const [expiresAt, setExpiresAt] = useState(row?.expires_at ? row.expires_at.slice(0, 10) : "");

  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      toast("กรุณากรอกหัวข้อและเนื้อหาประกาศ");
      return;
    }
    onSave({ title: title.trim(), body: body.trim(), pinned, expires_at: expiresAt || null });
  };

  return (
    <Dialog
      title={mode === "add" ? "สร้างประกาศใหม่" : "แก้ไขประกาศ"}
      desc="ประกาศจะแสดงในหน้าของนักศึกษาทุกคน"
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
  const confirm = useConfirm();

  const canManage = hasPermission(session?.user, PERMISSIONS.BROADCASTS_MANAGE);

  const loadData = async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("broadcasts")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setData(rows || []);
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
        headers={["หัวข้อ", "เนื้อหา", "หมดอายุ", "สถานะ", ""]}
        data={data}
        colSpan={5}
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
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
