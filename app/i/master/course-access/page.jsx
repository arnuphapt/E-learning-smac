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

function RowActions({ onEdit }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="iconbtn ghost" onClick={onEdit}><Icon name="pencil" size={15} /></button>
    </div>
  );
}

function CourseAccessDialog({ row, onClose, onSave }) {
  const [allowedYears, setAllowedYears] = React.useState(row?.access?.allowedYears?.join(", ") || "");
  const [allowedEmails, setAllowedEmails] = React.useState(row?.access?.allowedEmails?.join("\n") || "");

  const handleSave = () => {
    const yearsArr = allowedYears.split(",").map(y => y.trim()).filter(Boolean);
    const emailsArr = allowedEmails.split("\n").map(e => e.trim()).filter(Boolean);
    onSave({
      access: {
        allowedYears: yearsArr,
        allowedEmails: emailsArr
      }
    });
  };

  return (
    <Dialog title="ตั้งค่าสิทธิ์การเข้าถึงรายวิชา" desc={`ตั้งค่าผู้ที่มีสิทธิ์เข้าถึงวิชา ${row?.code || ""}`} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชั้นปีนักศึกษาที่อนุญาต (คั่นด้วยลูกน้ำ)</label>
        <input className="input" value={allowedYears} onChange={(e) => setAllowedYears(e.target.value)} placeholder="เช่น 65, 66, 67" />
        <div className="t-sm muted mt-1">นักศึกษาที่มีอีเมลขึ้นต้นด้วยเลขเหล่านี้จะสามารถเข้าถึงได้</div>
      </div>
      <div className="field">
        <label className="label">อีเมลพิเศษที่อนุญาต (บรรทัดละ 1 อีเมล)</label>
        <textarea className="input" rows={4} value={allowedEmails} onChange={(e) => setAllowedEmails(e.target.value)} placeholder="student@smnc.ac.th" />
      </div>
    </Dialog>
  );
}

export default function MasterCourseAccessPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("courses").select("*");
    if (!error) {
      setCourses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveAccess = async (updatedAccess) => {
    setDlg(null);
    const { error } = await supabase
      .from("courses")
      .update({ access: updatedAccess.access })
      .eq("id", dlg.row.id);
    
    if (error) {
      toast("เกิดข้อผิดพลาดในการบันทึกสิทธิ์: " + error.message);
    } else {
      setCourses(prev => prev.map(c => c.id === dlg.row.id ? { ...c, access: updatedAccess.access } : c));
      toast("บันทึกการแก้ไขสิทธิ์เรียบร้อยแล้ว");
    }
  };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="สิทธิ์การเข้าถึงรายวิชา"
        desc="กำหนดเงื่อนไขและเงื่อนเวลาของนักศึกษาในการลงทะเบียนเข้าสู่รายวิชาต่างๆ" />

      <div className="card">
        <div className="card-h flex items-center justify-between">
          <div>
            <div className="title">สิทธิ์การเข้าถึงรายวิชา</div>
            <div className="desc pretty">กำหนดรหัสนักศึกษา/อีเมล ที่สามารถเข้าถึงรายวิชานั้นๆ ได้</div>
          </div>
        </div>

        {loading ? (
          <Loading className="p-5 text-center muted" />
        ) : (
          <Table
            className="table"
            headers={["รหัสวิชา", "ชื่อวิชา", "ปีนักศึกษาที่เข้าได้", "อีเมลพิเศษ", ""]}
            data={courses}
            colSpan={5}
            renderRow={(c) => (
              <tr key={c.id}>
                <td><Badge tone="primary">{c.code}</Badge></td>
                <td className="fw-6">{c.title}</td>
                <td>{c.access?.allowedYears?.join(", ") || "-"}</td>
                <td className="t-sm muted">{c.access?.allowedEmails?.length ? `${c.access.allowedEmails.length} อีเมล` : "-"}</td>
                <td>
                  <RowActions
                    onEdit={() => setDlg({ mode: "edit", row: c })}
                  />
                </td>
              </tr>
            )}
          />
        )}
      </div>

      {dlg && <CourseAccessDialog row={dlg.row} onClose={() => setDlg(null)} onSave={handleSaveAccess} />}
    </div>
  );
}
