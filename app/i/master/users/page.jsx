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
import { signIn, useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";

function RowActions({ onEdit, onDelete, onImpersonate, canImpersonate }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      {canImpersonate && (
        <button className="iconbtn ghost c-primary" onClick={onImpersonate} title="ดูมุมมองผู้ใช้ (Impersonate)"><Icon name="eye" size={15} /></button>
      )}
      <button className="iconbtn ghost" onClick={onEdit}><Icon name="pencil" size={15} /></button>
      <button className="iconbtn ghost c-danger" onClick={onDelete}><Icon name="trash" size={15} /></button>
    </div>
  );
}

function RoleMultiSelect({ options, selectedValues, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.filter(o => selectedValues.includes(o.id));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(!open)}
        className="input"
        style={{ cursor: "pointer", minHeight: 40, height: "auto", padding: "6px 12px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
      >
        {selected.length === 0 ? (
          <span className="muted t-sm">เลือกบทบาท...</span>
        ) : (
          selected.map(o => (
            <span key={o.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "var(--primary-soft, #eef6ff)", color: "var(--primary)", border: "1px solid var(--border, #bfdbfe)", fontSize: 12, fontWeight: 600 }}>
              {o.name}
              <span onClick={(e) => { e.stopPropagation(); onChange(selectedValues.filter(id => id !== o.id)); }} style={{ cursor: "pointer", marginLeft: 2, fontSize: 11 }}>✕</span>
            </span>
          ))
        )}
        <Icon name="chevD" size={14} className="muted" style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: ".15s" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#fff", border: "1px solid var(--border-strong, #cbd5e1)", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,.1)", marginTop: 4, padding: 6 }}>
          {options.map(o => {
            const checked = selectedValues.includes(o.id);
            return (
              <div key={o.id} onClick={() => onChange(checked ? selectedValues.filter(id => id !== o.id) : [...selectedValues, o.id])}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, cursor: "pointer", background: checked ? "var(--primary-soft, #eef6ff)" : "transparent", color: checked ? "var(--primary)" : "var(--fg)", userSelect: "none" }}>
                <input type="checkbox" checked={checked} onChange={() => {}} style={{ pointerEvents: "none" }} />
                <div>
                  <div className="t-sm fw-6">{o.name}</div>
                  <div className="t-xs muted">{o.id}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserDialog({ mode, row, rolesList, subjectGroups, onClose, onSave }) {
  const [name, setName] = React.useState(row ? row.name : "");
  const [email, setEmail] = React.useState(row ? row.email : "");
  const [selectedRoles, setSelectedRoles] = React.useState(row && row.role ? row.role.split(",").map(r => r.trim()) : ["student"]);
  const [studentId, setStudentId] = React.useState(row ? (row.role?.split(",")[0] === "student" ? row.studentId : "") : "");
  const [sec, setSec] = React.useState(row ? row.sec : "ไม่มี");
  const [status, setStatus] = React.useState(row ? row.status : "active");
  const [groupId, setGroupId] = React.useState(row ? (row.group_id ?? "") : "");

  const isStudent = selectedRoles.includes("student");

  const handleSave = () => {
    if (!name || !email) {
      toast("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
      return;
    }
    onSave({
      name,
      email,
      role: selectedRoles.join(","),
      studentId: isStudent ? studentId : "อาจารย์ผู้สอน",
      sec: isStudent ? sec : "ไม่มี",
      groupId: !isStudent ? groupId : null,
      status
    });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่มผู้ใช้งาน" : "แก้ไขข้อมูลผู้ใช้งาน"} desc="กำหนดข้อมูลผู้ใช้งานและสิทธิ์ในระบบ" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชื่อ-นามสกุล <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น อ. ดร. สมชาย ใจดี หรือ ณัฐชยา ยิ้มแย้ม" />
      </div>
      <div className="field">
        <label className="label">อีเมล <span className="c-danger">*</span></label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@smnc.ac.th" />
      </div>
      
      <div className="field mb-3">
        <label className="label">บทบาท <span className="t-xs muted fw-4">(เลือกได้หลายบทบาท)</span></label>
        <RoleMultiSelect
          options={rolesList}
          selectedValues={selectedRoles}
          onChange={(next) => {
            if (next.length === 0) { toast("ต้องเลือกอย่างน้อย 1 บทบาท"); return; }
            setSelectedRoles(next);
          }}
        />
      </div>

      <div className="grid grid-2 gap-3">
        {isStudent ? (
          <div className="field">
            <label className="label">รหัสนักศึกษา</label>
            <input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="เช่น 65010001" />
          </div>
        ) : (
          <div className="field">
            <label className="label">ตำแหน่ง</label>
            <input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="เช่น อาจารย์" />
          </div>
        )}
        <div className="field">
          <label className="label">สถานะการใช้งาน</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">ใช้งานปกติ</option>
            <option value="suspended">ระงับการใช้งาน</option>
          </select>
        </div>
      </div>

      {!isStudent && (
        <div className="field">
          <label className="label">กลุ่มวิชา / สาขาวิชา</label>
          <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">ไม่ระบุกลุ่มวิชา</option>
            {subjectGroups && subjectGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
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

export default function MasterUsersPage() {
  const { data: session } = useSession();
  const canImpersonate = hasPermission(session?.user, PERMISSIONS.USERS_IMPERSONATE);
  const [usersList, setUsersList] = useState([]);
  const [gradesList, setGradesList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [subjectGroups, setSubjectGroups] = useState([]);
  const [groupManagers, setGroupManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}
  const [filterRole, setFilterRole] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");

  const loadData = async () => {
    setLoading(true);
    const [uRes, gRes, rRes, sgRes, sgmRes] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("student_grades").select("*"),
      supabase.from("roles").select("id, name"),
      supabase.from("subject_groups").select("*").eq("status", "active"),
      supabase.from("subject_group_managers").select("*")
    ]);

    if (rRes.data) {
      setRolesList(rRes.data);
    }

    if (gRes.data) {
      setGradesList(gRes.data);
    }

    if (sgRes.data) {
      setSubjectGroups(sgRes.data);
    }

    if (sgmRes.data) {
      setGroupManagers(sgmRes.data);
    }

    if (uRes.data) {
      setUsersList(uRes.data.map(u => ({
        ...u,
        studentId: u.student_no,
        sec: u.section,
        status: 'active'
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveUser = async (updatedUser) => {
    setDlg(null);
    const dbUser = {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      student_no: updatedUser.role === "student" ? updatedUser.studentId : updatedUser.studentId || "อาจารย์ผู้สอน",
      section: updatedUser.role === "student" ? updatedUser.sec : "ไม่มี",
      group_id: updatedUser.groupId || null
    };

    if (dlg.mode === "add") {
      const newId = "u_" + Date.now();
      const { error } = await supabase.from("users").insert([{ id: newId, ...dbUser }]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการเพิ่มผู้ใช้: " + error.message);
      } else {
        setUsersList(prev => [...prev, { id: newId, ...dbUser, studentId: dbUser.student_no, sec: dbUser.section, group_id: dbUser.group_id, status: updatedUser.status }]);
        toast("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("users").update(dbUser).eq("id", dlg.row.id);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไขผู้ใช้: " + error.message);
      } else {
        setUsersList(prev => prev.map(u => u.id === dlg.row.id ? { ...u, ...dbUser, studentId: dbUser.student_no, sec: dbUser.section, group_id: dbUser.group_id, status: updatedUser.status } : u));
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleImpersonate = async (user) => {
    toast("กำลังเตรียมสลับหน้าสวมบทบาท...");
    
    if (session?.user?.id && session?.user?.name) {
      if (!localStorage.getItem("original_admin_id")) {
        localStorage.setItem("original_admin_id", session.user.id);
        localStorage.setItem("original_admin_name", session.user.name);
      }
    }

    const userRoles = user.role ? user.role.split(",").map(r => r.trim()) : [];
    const isStaff = userRoles.includes("admin") || userRoles.includes("course_manager") || userRoles.includes("instructor");
    const callbackUrl = isStaff ? "/i/courses" : "/s/courses";

    const result = await signIn("credentials", {
      userId: user.id,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      toast("เกิดข้อผิดพลาดในการสวมบทบาท: " + result.error, "error");
    } else {
      toast(`สวมบทบาทเป็น ${user.name} สำเร็จ! กำลังเปลี่ยนหน้า...`);
      setTimeout(() => {
        window.location.href = callbackUrl;
      }, 800);
    }
  };

  const handleDeleteUser = async (id) => {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาดในการลบผู้ใช้งาน: " + error.message);
    } else {
      setUsersList(prev => prev.filter(u => u.id !== id));
      toast("ลบผู้ใช้งานเรียบร้อยแล้ว");
    }
  };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="จัดการผู้ใช้งาน"
        desc="จัดการบัญชีผู้ใช้ในระบบ สิทธิ์บทบาทหน้าที่ และข้อมูลกลุ่มเรียนของนักศึกษา" />

      <Table
        title="จัดการผู้ใช้งาน"
        description="จัดการข้อมูลผู้สอน นักศึกษา และสิทธิ์การใช้งานระบบ"
        addButton={
          <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}>
            <Icon name="plus" size={15} />เพิ่มผู้ใช้
          </button>
        }
        loading={loading}
        className="table"
        enableSearch={true}
        searchKeys={["name", "email", "studentId"]}
        searchPlaceholder="ค้นหาชื่อ, อีเมล หรือรหัส..."
        headers={[
          "ชื่อ-นามสกุล",
          "อีเมล",
          "บทบาท",
          "รหัสประจำตัว / ตำแหน่ง",
          "สถานะ",
          ""
        ]}
        data={usersList.filter((u) => {
          if (filterRole !== "all") {
            const roles = u.role ? u.role.split(",").map(r => r.trim()) : [];
            if (!roles.includes(filterRole)) return false;
          }
          if (filterGrade !== "all") {
            const roles = u.role ? u.role.split(",").map(r => r.trim()) : [];
            if (!roles.includes("student") || !u.studentId) return false;
            const prefix = String(u.studentId).slice(0, 2);
            const gradeMapping = gradesList.find(g => g.prefix === prefix);
            if (!gradeMapping || gradeMapping.year_label !== filterGrade) return false;
          }
          return true;
        })}
        colSpan={6}
        filter={
          <>
            <select
              className="input"
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                if (e.target.value !== "all" && e.target.value !== "student") {
                  setFilterGrade("all");
                }
              }}
              style={{ width: 160, height: 38, padding: "0 12px", fontSize: 13, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8 }}
            >
              <option value="all">บทบาท: ทั้งหมด</option>
              {rolesList.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {(filterRole === "all" || filterRole === "student") && (
              <select
                className="input"
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                style={{ width: 160, height: 38, padding: "0 12px", fontSize: 13, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8 }}
              >
                <option value="all">ชั้นปี: ทั้งหมด</option>
                {Array.from(new Set(gradesList.map(g => g.year_label))).sort().map(lbl => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            )}
          </>
        }
        renderRow={(u) => (
          <tr key={u.id}>
            <td>
              <div className="flex items-center gap-2">
                <Avatar name={u.name ? u.name.replace(/^อ\. (ดร\. )?/, "") : "?"} size={28} />
                <span className="fw-6">{u.name}</span>
              </div>
            </td>
            <td className="t-sm muted">{u.email}</td>
            <td>
              {(() => {
                const userRoles = u.role ? u.role.split(",").map(x => x.trim()) : [];
                const userGroupIds = groupManagers.filter(sgm => sgm.user_id === u.id).map(sgm => sgm.group_id);
                const userGroupNames = subjectGroups.filter(g => userGroupIds.includes(g.id)).map(g => g.name);
                const groupsDisplay = userGroupNames.length > 0 ? userGroupNames.join(", ") : (u.group_id && subjectGroups.find(g => g.id === u.group_id)?.name);
                return (
                  <div className="flex col gap-1">
                    <div className="flex gap-1 flex-wrap">
                      {userRoles.map(roleId => {
                        const r = rolesList.find(x => x.id === roleId);
                        const roleName = r ? r.name : roleId;
                        const tone = roleId === "admin" ? "danger" : roleId === "instructor" ? "primary" : roleId === "student" ? "info" : "outline";
                        return <Badge key={roleId} tone={tone}>{roleName}</Badge>;
                      })}
                    </div>
                    {groupsDisplay && <div className="t-xs muted mt-1">{groupsDisplay}</div>}
                  </div>
                );
              })()}
            </td>
            <td className="tnum t-sm">
              <div>{u.studentId || "-"}</div>
              {u.role?.split(",").map(r => r.trim()).includes("student") && u.studentId && (
                <div className="t-xs muted" style={{ fontSize: "11px", marginTop: "2px" }}>
                  {(() => {
                    const prefix = String(u.studentId).slice(0, 2);
                    const mapping = gradesList.find(g => g.prefix === prefix);
                    return mapping ? mapping.year_label : "";
                  })()}
                </div>
              )}
            </td>
            <td>
              {u.status === "active" ? (
                <Badge tone="success" dot>ใช้งาน</Badge>
              ) : (
                <Badge tone="warning" dot>ระงับ</Badge>
              )}
            </td>
            <td>
              <RowActions
                onEdit={() => setDlg({ mode: "edit", row: u })}
                onDelete={() => {
                  setConfirmDlg({
                    title: "ลบผู้ใช้งาน",
                    desc: `ต้องการลบ "${u.name}" ออกจากระบบ?`,
                    onConfirm: () => handleDeleteUser(u.id)
                  });
                }}
                onImpersonate={() => handleImpersonate(u)}
                canImpersonate={canImpersonate}
              />
            </td>
          </tr>
        )}
      />

      {dlg && <UserDialog mode={dlg.mode} row={dlg.row} rolesList={rolesList} subjectGroups={subjectGroups} onClose={() => setDlg(null)} onSave={handleSaveUser} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
