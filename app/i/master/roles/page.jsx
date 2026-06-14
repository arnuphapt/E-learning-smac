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

const RESOURCES = [
  {
    key: "courses",
    label: "รายวิชา (Courses)",
    actions: [
      { id: "courses:view", label: "ดู" },
      { id: "courses:create", label: "สร้าง" },
      { id: "courses:edit", label: "แก้ไข" },
      { id: "courses:delete", label: "ลบ" }
    ]
  },
  {
    key: "lessons",
    label: "บทเรียน (Lessons)",
    actions: [
      { id: "lessons:view", label: "ดู" },
      { id: "lessons:create", label: "สร้าง" },
      { id: "lessons:edit", label: "แก้ไข" },
      { id: "lessons:delete", label: "ลบ" }
    ]
  },
  {
    key: "submissions",
    label: "ตรวจงาน (Submissions)",
    actions: [
      { id: "submissions:view", label: "ดูงานส่ง" },
      { id: "submissions:grade", label: "ตรวจ/ให้คะแนน" }
    ]
  },
  {
    key: "reports",
    label: "รายงาน (Reports)",
    actions: [
      { id: "reports:view", label: "ดู/ส่งออกรายงาน" }
    ]
  },
  {
    key: "master",
    label: "ข้อมูลหลัก (Master Data)",
    actions: [
      { id: "master:manage", label: "จัดการทั้งหมด" }
    ]
  },
  {
    key: "users",
    label: "ผู้ใช้งานและสิทธิ์ (Users/Roles)",
    actions: [
      { id: "users:manage", label: "จัดการทั้งหมด" }
    ]
  }
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
      lg={true}
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
        <label className="label">กำหนดสิทธิ์แยกตามประเภทการใช้งาน (Permissions Grid)</label>
        <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>เมนู / ทรัพยากร</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>การจัดการสิทธิ์การเข้าถึง</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map(res => (
                <tr key={res.key} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 500, width: "220px", background: "#fcfcfd" }}>{res.label}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                      {res.actions.map(act => (
                        <label key={act.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                          <input 
                            type="checkbox" 
                            checked={permissions.includes(act.id)}
                            onChange={() => togglePermission(act.id)}
                          />
                          <span>{act.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
