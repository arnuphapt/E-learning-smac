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

function MultiSelect({ options, selectedValues, onChange, placeholder = "เลือกคณาจารย์..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOptions = options.filter(opt => selectedValues.includes(opt.id));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <style>{`
        .multi-option-item:hover {
          background-color: var(--muted, #f1f5f9) !important;
        }
      `}</style>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between"
        style={{ 
          cursor: "pointer", 
          minHeight: 40, 
          height: "auto", 
          padding: "6px 12px", 
          display: "flex", 
          flexWrap: "wrap", 
          gap: 6,
          background: "var(--surface, #fff)",
          border: "1px solid var(--border-strong, #cbd5e1)",
          borderRadius: 8
        }}
      >
        {selectedOptions.length === 0 ? (
          <span className="muted t-sm">{placeholder}</span>
        ) : (
          <div className="flex wrap gap-1" style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {selectedOptions.map(opt => (
              <span 
                key={opt.id} 
                className="badge" 
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 4, 
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "var(--primary-soft, #eef6ff)",
                  color: "var(--primary-soft-fg, #1e5fa8)",
                  border: "1px solid var(--border, #bfdbfe)",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                {opt.name}
                <span 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onChange(selectedValues.filter(id => id !== opt.id)); 
                  }}
                  style={{ 
                    cursor: "pointer", 
                    fontWeight: "bold",
                    fontSize: 12,
                    marginLeft: 4,
                    color: "var(--primary)"
                  }}
                >
                  ✕
                </span>
              </span>
            ))}
          </div>
        )}
        <Icon name="chevD" size={15} className="muted" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: ".15s", marginLeft: "auto" }} />
      </div>

      {isOpen && (
        <div 
          style={{ 
            position: "absolute", 
            top: "100%", 
            left: 0, 
            right: 0, 
            zIndex: 100, 
            background: "#fff", 
            border: "1px solid var(--border-strong, #cbd5e1)", 
            borderRadius: 8, 
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)", 
            marginTop: 4, 
            maxHeight: 220, 
            overflowY: "auto",
            padding: 6
          }}
        >
          {options.length === 0 ? (
            <div className="t-xs muted text-center p-3">ไม่มีข้อมูลผู้ใช้งาน</div>
          ) : (
            options.map(u => {
              const isSelected = selectedValues.includes(u.id);
              return (
                <div 
                  key={u.id}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter(id => id !== u.id));
                    } else {
                      onChange([...selectedValues, u.id]);
                    }
                  }}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8, 
                    padding: "8px 12px", 
                    borderRadius: 6,
                    cursor: "pointer", 
                    background: isSelected ? "var(--primary-soft, #eef6ff)" : "transparent",
                    color: isSelected ? "var(--primary-soft-fg, #1e5fa8)" : "var(--fg)",
                    transition: ".1s",
                    userSelect: "none",
                    marginBottom: 2
                  }}
                  className="multi-option-item"
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ pointerEvents: "none" }}
                  />
                  <div className="flex col" style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                    <span className="t-sm fw-6" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</span>
                    <span className="t-xs muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.role === "course_manager" ? "ผู้รับผิดชอบ" : "ผู้สอน"} · {u.email}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function GroupDialog({ mode, row, instructors, groupManagers, onClose, onSave }) {
  const [name, setName] = React.useState(row ? row.name : "");
  const [status, setStatus] = React.useState(row ? row.status : "active");

  // Filter course managers and admins to show in the list
  const courseManagersList = instructors.filter(u => u.role === "course_manager" || u.role === "instructor");
  const initialSelected = row ? groupManagers.filter(u => u.group_id === row.id).map(u => u.user_id) : [];
  const [selectedManagers, setSelectedManagers] = React.useState(initialSelected);

  const handleSave = () => {
    if (!name) { toast("กรุณากรอกชื่อกลุ่มวิชา"); return; }
    onSave({ 
      name, 
      status, 
      courses: row ? row.courses || 0 : 0,
      selectedManagers 
    });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่มกลุ่มวิชา" : "แก้ไขกลุ่มวิชา"} desc="กลุ่มสาขาวิชาและคณาจารย์ผู้รับผิดชอบ" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชื่อกลุ่มวิชา <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น วิทยาการคอมพิวเตอร์" />
      </div>
      
      <div className="field" style={{ marginTop: 16, marginBottom: 16 }}>
        <label className="label">คณาจารย์ผู้รับผิดชอบ (เลือกได้หลายคน)</label>
        <MultiSelect 
          options={courseManagersList}
          selectedValues={selectedManagers}
          onChange={setSelectedManagers}
          placeholder="เลือกคณาจารย์ผู้รับผิดชอบ..."
        />
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
  const [groupManagers, setGroupManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}

  const loadData = async () => {
    setLoading(true);
    const [gRes, uRes, sgmRes, cRes] = await Promise.all([
      supabase.from("subject_groups").select("*"),
      supabase.from("users").select("*"),
      supabase.from("subject_group_managers").select("*"),
      supabase.from("courses").select("id, group_id")
    ]);
    if (!gRes.error) {
      const courses = cRes.data || [];
      const groups = (gRes.data || []).map(g => ({
        ...g,
        courses: courses.filter(c => c.group_id === g.id).length
      }));
      setSubjectGroups(groups);
    }
    if (!uRes.error) setInstructors(uRes.data || []);
    if (!sgmRes.error) setGroupManagers(sgmRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveGroup = async (updatedGroup) => {
    setDlg(null);
    const { selectedManagers, ...groupFields } = updatedGroup;
    let groupId = dlg.row?.id;

    if (dlg.mode === "add") {
      groupId = "g_" + Date.now();
      const obj = { id: groupId, ...groupFields };
      const { error } = await supabase.from("subject_groups").insert([obj]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการสร้างกลุ่มวิชา: " + error.message);
        return;
      }
      setSubjectGroups(prev => [...prev, obj]);
      toast("เพิ่มกลุ่มวิชาเรียบร้อยแล้ว");
    } else {
      const { error } = await supabase.from("subject_groups").update(groupFields).eq("id", groupId);
      if (error) {
        toast("เกิดข้อผิดพลาดในการแก้ไขกลุ่มวิชา: " + error.message);
        return;
      }
      setSubjectGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...groupFields } : g));
      toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
    }

    // Update managers in subject_group_managers
    await supabase.from("subject_group_managers").delete().eq("group_id", groupId);

    if (selectedManagers.length > 0) {
      const insertRows = selectedManagers.map(userId => ({
        group_id: groupId,
        user_id: userId
      }));
      await supabase.from("subject_group_managers").insert(insertRows);
    }

    loadData();
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
             headers={["กลุ่มวิชา", "อาจารย์ผู้รับผิดชอบประจำกลุ่มวิชา", "รายวิชา", "สถานะ", ""]}
             data={subjectGroups}
             colSpan={5}
             renderRow={(g) => {
               const currentGroupManagers = groupManagers
                 .filter(m => m.group_id === g.id)
                 .map(m => instructors.find(u => u.id === m.user_id))
                 .filter(Boolean);
               return (
                 <tr key={g.id}>
                   <td className="fw-6">{g.name}</td>
                   <td>
                     <div className="flex col gap-1" style={{ alignItems: "flex-start" }}>
                       {currentGroupManagers.length === 0 ? (
                         <span className="muted t-sm">- ยังไม่มีอาจารย์ผู้รับผิดชอบ -</span>
                       ) : (
                         currentGroupManagers.map(m => (
                           <div key={m.id} className="t-sm flex items-center gap-2" style={{ padding: "2px 0" }}>
                             <Avatar name={m.name ? m.name.replace(/^อ\. (ดร\. )?/, "") : "?"} size={22} />
                             <span>{m.name} ({m.role === "course_manager" ? "ผู้รับผิดชอบ" : "ผู้สอน"})</span>
                           </div>
                         ))
                       )}
                     </div>
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
               );
             }}
          />

      {dlg && <GroupDialog mode={dlg.mode} row={dlg.row} instructors={instructors} groupManagers={groupManagers} onClose={() => setDlg(null)} onSave={handleSaveGroup} />}
      {confirmDlg && <ConfirmDialog title={confirmDlg.title} desc={confirmDlg.desc} onConfirm={confirmDlg.onConfirm} onClose={() => setConfirmDlg(null)} />}
    </div>
  );
}
