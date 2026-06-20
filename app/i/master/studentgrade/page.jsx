"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog, Select } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";
import { toast } from "@/components/ui/Toast";

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="iconbtn ghost" onClick={onEdit}>
        <Icon name="pencil" size={15} />
      </button>
      <button className="iconbtn ghost c-danger" onClick={onDelete}>
        <Icon name="trash" size={15} />
      </button>
    </div>
  );
}

function GradeDialog({ mode, row, onClose, onSave, existingPrefixes }) {
  const [prefix, setPrefix] = useState(row ? row.prefix : "");
  const [yearLabel, setYearLabel] = useState(row ? row.year_label : "ชั้นปีที่ 1");
  const [customLabel, setCustomLabel] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (row) {
      const standardYears = ["ชั้นปีที่ 1", "ชั้นปีที่ 2", "ชั้นปีที่ 3", "ชั้นปีที่ 4"];
      if (!standardYears.includes(row.year_label)) {
        setIsCustom(true);
        setCustomLabel(row.year_label);
      }
    }
  }, [row]);

  const handleSave = () => {
    const cleanPrefix = prefix.trim();
    if (!cleanPrefix || cleanPrefix.length !== 2 || isNaN(cleanPrefix)) {
      toast("กรุณากรอกรหัสนักศึกษา 2 ตัวแรกให้ถูกต้อง (เช่น 66)");
      return;
    }

    if (mode === "add" && existingPrefixes.includes(cleanPrefix)) {
      toast(`รหัสประจำตัวขึ้นต้นด้วย "${cleanPrefix}" ได้ถูกกำหนดไว้แล้ว`);
      return;
    }

    const finalLabel = isCustom ? customLabel.trim() : yearLabel;
    if (!finalLabel) {
      toast("กรุณาระบุชั้นปี");
      return;
    }

    onSave({
      prefix: cleanPrefix,
      year_label: finalLabel,
    });
  };

  return (
    <Dialog
      title={mode === "add" ? "เพิ่มการกำหนดชั้นปี" : "แก้ไขการกำหนดชั้นปี"}
      desc="กำหนดความสัมพันธ์ระหว่างเลขรหัสนักศึกษา 2 ตัวหน้าและระดับชั้นปี"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Icon name="check" size={15} /> บันทึก
          </button>
        </>
      }
    >
      <div className="field">
        <label className="label">
          รหัสนักศึกษา 2 ตัวหน้า <span className="c-danger">*</span>
        </label>
        <input
          className="input"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value.replace(/\D/g, "").slice(0, 2))}
          placeholder="เช่น 65 หรือ 66"
          disabled={mode === "edit"}
          maxLength={2}
          style={{ width: "100%" }}
        />
        {mode === "add" && <p className="t-xs muted mt-1">ตัวเลข 2 หลักแรกของรหัสนักศึกษา (เช่น นักศึกษารหัส 66xxxxxx ป้อน 66)</p>}
      </div>

      <div className="field">
        <label className="label">
          ระดับชั้นปี <span className="c-danger">*</span>
        </label>
        <div className="flex col gap-2">
          <div className="flex gap-3 items-center">
            <input
              type="radio"
              id="standard-year"
              name="year-type"
              checked={!isCustom}
              onChange={() => setIsCustom(false)}
            />
            <label htmlFor="standard-year" className="pointer t-sm fw-5">
              เลือกจากรายการชั้นปีมาตรฐาน
            </label>
          </div>
          {!isCustom && (
            <Select
              className="input"
              value={yearLabel}
              onChange={(e) => setYearLabel(e.target.value)}
              style={{ width: "100%", height: 38 }}
            >
              <option value="ชั้นปีที่ 1">ชั้นปีที่ 1</option>
              <option value="ชั้นปีที่ 2">ชั้นปีที่ 2</option>
              <option value="ชั้นปีที่ 3">ชั้นปีที่ 3</option>
              <option value="ชั้นปีที่ 4">ชั้นปีที่ 4</option>
            </Select>
          )}

          <div className="flex gap-3 items-center mt-2">
            <input
              type="radio"
              id="custom-year"
              name="year-type"
              checked={isCustom}
              onChange={() => setIsCustom(true)}
            />
            <label htmlFor="custom-year" className="pointer t-sm fw-5">
              กำหนดชั้นปีเอง (Custom)
            </label>
          </div>
          {isCustom && (
            <input
              className="input"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="เช่น ชั้นปีที่ 5 หรือ หลักสูตรพิเศษ"
              style={{ width: "100%" }}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}

function ConfirmDialog({ title, desc, onConfirm, onClose }) {
  return (
    <Dialog
      title={title}
      desc={desc}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="btn"
            style={{ background: "var(--danger)", color: "#fff" }}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <Icon name="trash" size={15} /> ลบข้อมูล
          </button>
        </>
      }
    >
      <div
        className="flex items-center gap-3 p-2"
        style={{ background: "var(--danger-soft, #fff1f0)", borderRadius: 10 }}
      >
        <span style={{ fontSize: 28 }}>⚠️</span>
        <span className="t-sm pretty" style={{ color: "var(--danger)" }}>
          การดำเนินการนี้จะลบการเชื่อมโยงชั้นปีนี้ออกจากระบบ กรุณาตรวจสอบก่อนดำเนินการต่อ
        </span>
      </div>
    </Dialog>
  );
}

export default function MasterStudentGradePage() {
  const [gradesList, setGradesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState(null); // {mode, row}
  const [confirmDlg, setConfirmDlg] = useState(null); // {title, desc, onConfirm}
  
  // Filters state
  const [filterYearLabel, setFilterYearLabel] = useState("all");

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("student_grades")
      .select("*")
      .order("prefix", { ascending: false });

    if (!error) {
      setGradesList(data || []);
    } else {
      toast("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveGrade = async (gradeData) => {
    setDlg(null);
    if (dlg.mode === "add") {
      const newGrade = {
        id: "sg_" + Date.now(),
        ...gradeData,
      };
      const { error } = await supabase.from("student_grades").insert([newGrade]);
      if (error) {
        toast("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      } else {
        setGradesList((prev) => [newGrade, ...prev].sort((a, b) => b.prefix.localeCompare(a.prefix)));
        toast("บันทึกการกำหนดชั้นปีเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase
        .from("student_grades")
        .update({ year_label: gradeData.year_label })
        .eq("id", dlg.row.id);

      if (error) {
        toast("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      } else {
        setGradesList((prev) =>
          prev.map((g) => (g.id === dlg.row.id ? { ...g, year_label: gradeData.year_label } : g))
        );
        toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleDeleteGrade = async (id) => {
    const { error } = await supabase.from("student_grades").delete().eq("id", id);
    if (error) {
      toast("เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
    } else {
      setGradesList((prev) => prev.filter((g) => g.id !== id));
      toast("ลบการกำหนดชั้นปีเรียบร้อยแล้ว");
    }
  };

  // Filter logic
  const filteredGrades = gradesList.filter((g) => {
    return filterYearLabel === "all" || g.year_label === filterYearLabel;
  });

  // Get unique year labels for filter dropdown
  const uniqueYearLabels = Array.from(new Set(gradesList.map((g) => g.year_label))).sort();

  return (
    <div className="container">
      <PageHead
        kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)"
        title="กำหนดชั้นปีนักศึกษา"
        desc="จัดการการจับคู่ตัวเลขรหัสนักศึกษา 2 หลักแรกเข้ากับระดับชั้นปีการศึกษา"
      />

      <Table
        title="กำหนดชั้นปีนักศึกษา"
        description="ความเชื่อมโยงของรหัสนักศึกษา (เช่น รหัสที่ขึ้นต้นด้วย 66 จะเป็นนักศึกษาชั้นปีที่ 2)"
        addButton={
          <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}>
            <Icon name="plus" size={15} /> เพิ่มการจับคู่
          </button>
        }
        loading={loading}
        className="table"
            enableSearch={true}
            searchKeys={["prefix", "year_label"]}
            searchPlaceholder="ค้นหาเลขรหัส หรือ ชั้นปี..."
            headers={["เลขรหัส 2 ตัวหน้า", "ชั้นปีการศึกษา", "วันที่สร้าง", ""]}
            data={filteredGrades}
            colSpan={4}
            filter={
              <Select
                className="input"
                value={filterYearLabel}
                onChange={(e) => setFilterYearLabel(e.target.value)}
                style={{ width: 180, height: 38 }}
              >
                <option value="all">ระดับชั้นปี: ทั้งหมด</option>
                {uniqueYearLabels.map((lbl) => (
                  <option key={lbl} value={lbl}>
                    {lbl}
                  </option>
                ))}
              </Select>
            }
            renderRow={(g) => (
              <tr key={g.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--primary-soft)",
                        color: "var(--primary)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {g.prefix}
                    </div>
                    <span className="fw-6">รหัสประจำตัวขึ้นต้นด้วย {g.prefix}</span>
                  </div>
                </td>
                <td>
                  <Badge tone="info">{g.year_label}</Badge>
                </td>
                <td className="muted t-sm">
                  {new Date(g.created_at).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </td>
                <td>
                  <RowActions
                    onEdit={() => setDlg({ mode: "edit", row: g })}
                    onDelete={() => {
                      setConfirmDlg({
                        title: "ลบการกำหนดชั้นปี",
                        desc: `คุณต้องการลบสิทธิ์การเชื่อมโยงของรหัส "${g.prefix}" หรือไม่?`,
                        onConfirm: () => handleDeleteGrade(g.id),
                      });
                    }}
                  />
                </td>
              </tr>
            )}
          />

      {dlg && (
        <GradeDialog
          mode={dlg.mode}
          row={dlg.row}
          onClose={() => setDlg(null)}
          onSave={handleSaveGrade}
          existingPrefixes={gradesList.map((g) => g.prefix)}
        />
      )}
      {confirmDlg && (
        <ConfirmDialog
          title={confirmDlg.title}
          desc={confirmDlg.desc}
          onConfirm={confirmDlg.onConfirm}
          onClose={() => setConfirmDlg(null)}
        />
      )}
    </div>
  );
}
