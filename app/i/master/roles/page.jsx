"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";
import { PERMISSIONS } from "@/lib/rbac";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const AVAILABLE_PERMISSIONS = [
  { id: PERMISSIONS.MANAGE_COURSES, label: "จัดการรายวิชา", desc: "สร้าง แก้ไข ลบรายวิชา" },
  { id: PERMISSIONS.GRADE_SUBMISSIONS, label: "ตรวจงาน/ให้คะแนน", desc: "ดูและตรวจงานที่นักศึกษาส่ง" },
  { id: PERMISSIONS.VIEW_REPORTS, label: "ดูรายงาน", desc: "ดูรายงานและส่งออก Excel" },
  { id: PERMISSIONS.MANAGE_MASTER_DATA, label: "จัดการข้อมูลหลัก", desc: "จัดการปีการศึกษา กลุ่มวิชา ฯลฯ" },
  { id: PERMISSIONS.MANAGE_USERS, label: "จัดการผู้ใช้และสิทธิ์", desc: "จัดการบัญชีผู้ใช้งานและ Roles" },
];

function RowActions({ onEdit, onDelete, disableDelete }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="iconbtn ghost" onClick={onEdit}><Icon name="pencil" size={15} /></button>
      {!disableDelete && (
        <button className="iconbtn ghost c-danger" onClick={onDelete}><Icon name="trash" size={15} /></button>
      )}
    </div>
  );
}

function RoleDialog({ mode, row, onClose, onSave }) {
  const [id, setId] = useState(row ? row.id : "");
  const [name, setName] = useState(row ? row.name : "");
  const [description, setDescription] = useState(row ? row.description : "");
  const [permissions, setPermissions] = useState(row ? row.permissions || [] : []);

  const handleSave = () => {
    if (!id || !name) {
      toast("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
      return;
    }
    // Prevent changing id of default roles, or only allow in add mode
    onSave({
      id: mode === "add" ? id.toLowerCase().replace(/[^a-z0-9_]/g, '') : id,
      name,
      description,
      permissions
    });
  };

  const togglePermission = (permId) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId));
    } else {
      setPermissions([...permissions, permId]);
    }
  };

  return (
    <Dialog 
      title={mode === "add" ? "สร้าง Role ใหม่" : "แก้ไขข้อมูล Role"} 
      desc="กำหนดชื่อ Role และเลือกสิทธิ์การเข้าถึงเมนูต่างๆ" 
      onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}
    >
      <div className="grid grid-2 gap-3">
        <div className="field">
          <label className="label">รหัส Role (ID) <span className="c-danger">*</span></label>
          <input 
            className="input" 
            value={id} 
            onChange={(e) => setId(e.target.value)} 
            placeholder="เช่น ta, editor" 
            disabled={mode === "edit"} 
          />
        </div>
        <div className="field">
          <label className="label">ชื่อ Role <span className="c-danger">*</span></label>
          <input 
            className="input" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="เช่น ผู้ช่วยสอน" 
          />
        </div>
      </div>
      <div className="field">
        <label className="label">รายละเอียด</label>
        <input 
          className="input" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          placeholder="อธิบายหน้าที่ของ Role นี้" 
        />
      </div>
      
      <div className="field" style={{ marginTop: 16 }}>
        <label className="label">กำหนดสิทธิ์ (Permissions)</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--muted)", padding: 12, borderRadius: 8 }}>
          {AVAILABLE_PERMISSIONS.map(perm => (
            <label key={perm.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={permissions.includes(perm.id)}
                onChange={() => togglePermission(perm.id)}
                style={{ marginTop: 4 }}
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{perm.label}</div>
                <div style={{ fontSize: 12, color: "var(--muted-fg)" }}>{perm.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </Dialog>
  );
}

export default function RolesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // { mode: 'add'|'edit', row: null|obj }
  const confirm = useConfirm();

  const fetchData = async () => {
    setLoading(true);
    const { data: roles, error } = await supabase
      .from("roles")
      .select("*")
      .order("created_at", { ascending: true });
      
    if (roles) setData(roles);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (roleData) => {
    try {
      if (dialog.mode === "add") {
        const { error } = await supabase.from("roles").insert([roleData]);
        if (error) throw error;
        toast("สร้าง Role เรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("roles")
          .update({ 
            name: roleData.name, 
            description: roleData.description, 
            permissions: roleData.permissions 
          })
          .eq("id", roleData.id);
        if (error) throw error;
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
      setDialog(null);
      fetchData();
    } catch (error) {
      toast("เกิดข้อผิดพลาด: " + error.message, "error");
    }
  };

  const handleDelete = async (row) => {
    if (["admin", "instructor", "student"].includes(row.id)) {
      toast("ไม่สามารถลบ Role ระบบพื้นฐานได้", "error");
      return;
    }
    
    if (!(await confirm({
      title: "ลบ Role",
      description: `คุณต้องการลบ Role "${row.name}" ใช่หรือไม่? ผู้ใช้ที่มี Role นี้อาจได้รับผลกระทบ`,
      confirmText: "ลบข้อมูล",
      danger: true
    }))) {
      return;
    }

    try {
      const { error } = await supabase.from("roles").delete().eq("id", row.id);
      if (error) throw error;
      toast("ลบ Role เรียบร้อยแล้ว");
      fetchData();
    } catch (error) {
      toast("ไม่สามารถลบได้ อาจมีการใช้งาน Role นี้อยู่", "error");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container">
      <PageHead 
        title="จัดการสิทธิ์ (Roles)" 
        desc="กำหนด Role และสิทธิ์การเข้าถึงเมนูต่างๆ ในระบบ" 
        actions={
          <button className="btn btn-primary" onClick={() => setDialog({ mode: "add", row: null })}>
            <Icon name="plus" size={16} />เพิ่ม Role
          </button>
        }
      />
      
      <div className="card no-pad mt-4">
        <Table 
          headers={[
            "รหัส",
            "ชื่อ Role",
            "จำนวนสิทธิ์",
            ""
          ]}
          data={data}
          colSpan={4}
          renderRow={(row) => (
            <tr key={row.id}>
              <td><span className="t-mono">{row.id}</span></td>
              <td>
                <div>
                  <div className="fw-5">{row.name}</div>
                  {row.description && <div className="t-xs muted mt-1">{row.description}</div>}
                </div>
              </td>
              <td>
                <Badge tone={row.permissions?.length > 0 ? "primary" : "outline"}>
                  {row.permissions?.length || 0} สิทธิ์
                </Badge>
              </td>
              <td>
                <RowActions 
                  onEdit={() => setDialog({ mode: "edit", row })} 
                  onDelete={() => handleDelete(row)}
                  disableDelete={["admin", "instructor", "student"].includes(row.id)}
                />
              </td>
            </tr>
          )}
        />
      </div>

      {dialog && (
        <RoleDialog 
          mode={dialog.mode} 
          row={dialog.row} 
          onClose={() => setDialog(null)} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
}
