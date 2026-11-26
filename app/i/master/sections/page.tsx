"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import { MasterListPage, useConfirmDelete } from "@/components/master/list-page";
import { sectionColumns, type SectionTableRow } from "@/components/master/sections/columns";
import { SectionDialog, type SectionItem, type SectionSaveInput } from "@/components/master/sections/section-dialog";
import { getStudentSectionName } from "@/components/master/sections/student-section";

type StudentSummary = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "student_no" | "section"
>;

type SectionDialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: SectionItem };

export default function MasterSectionsPage() {
  const [sectionList, setSectionList] = useState<SectionItem[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<SectionDialogState | null>(null);
  const confirmDelete = useConfirmDelete();

  const [reloadKey, setReloadKey] = useState(0);
  const loadData = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const load = async () => {
      const [secRes, uRes, yrRes] = await Promise.all([
        supabase.from("sections").select("*").order("name"),
        supabase.from("users").select("student_no, section").eq("role", "student"),
        supabase.from("student_grades").select("year_label").eq("domain", DEFAULT_DOMAIN).order("year_label")
      ]);
      if (!secRes.error) setSectionList(secRes.data || []);
      if (!uRes.error) setStudents(uRes.data || []);
      if (!yrRes.error && yrRes.data) {
        setAvailableYears(Array.from(new Set(yrRes.data.map((y) => y.year_label))));
      } else {
        setAvailableYears([]);
      }
      setLoading(false);
    };
    load();
  }, [reloadKey]);

  const handleSaveSection = async (updatedSection: SectionSaveInput) => {
    if (!dlg) return;
    const currentDlg = dlg;
    setDlg(null);
    if (currentDlg.mode === "add") {
      const obj: SectionItem = { id: "s_" + Date.now(), ...updatedSection };
      const { error } = await supabase.from("sections").insert([obj]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการสร้าง Section: " + error.message);
      } else {
        setSectionList((prev) => [...prev, obj]);
        toast.success("เพิ่ม Section เรียบร้อยแล้ว");
        loadData();
      }
    } else {
      const { error } = await supabase.from("sections").update(updatedSection).eq("id", currentDlg.row.id);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการแก้ไข Section: " + error.message);
      } else {
        setSectionList((prev) => prev.map((s) => (s.id === currentDlg.row.id ? { ...s, ...updatedSection } : s)));
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
        loadData();
      }
    }
  };

  const handleDeleteSection = async (s: SectionItem) => {
    if (!(await confirmDelete("ลบ Section", `คุณต้องการลบ "${s.name}" หรือไม่?`))) return;
    const { error } = await supabase.from("sections").delete().eq("id", s.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบ Section: " + error.message);
    } else {
      setSectionList((prev) => prev.filter((r) => r.id !== s.id));
      toast.success("ลบ Section เรียบร้อยแล้ว");
      loadData();
    }
  };

  const handleBulkDeleteSections = async (rows: SectionTableRow[]) => {
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("sections").delete().in("id", ids);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบ Section: " + error.message);
      return false;
    }
    setSectionList((prev) => prev.filter((r) => !ids.includes(r.id)));
    toast.success(`ลบ Section ${ids.length} รายการเรียบร้อยแล้ว`);
    loadData();
    return true;
  };

  const rows = useMemo<SectionTableRow[]>(
    () =>
      sectionList.map((s) => ({
        ...s,
        count: students.filter((st) => getStudentSectionName(st.student_no, st.section, sectionList) === s.name).length,
      })),
    [sectionList, students],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters and the supabase client
  const columns = useMemo(() => sectionColumns((row) => setDlg({ mode: "edit", row }), handleDeleteSection), []);

  return (
    <MasterListPage
      title="กลุ่มเรียน"
      description="จัดการข้อมูลห้องเรียนและกลุ่มเรียนของนักศึกษา"
      note="กลุ่มเรียนของนักศึกษาในระบบ"
      addLabel="เพิ่ม Section"
      onAdd={() => setDlg({ mode: "add" })}
      bulkDelete={{ noun: " Section", rowLabel: (r) => r.name || r.id, onDelete: handleBulkDeleteSections }}
      data={rows}
      columns={columns}
      loading={loading}
      searchKeys={["name", "year_level"]}
      searchPlaceholder="ค้นหา Section…"
      emptyTitle="ยังไม่มี Section"
    >
      {dlg && <SectionDialog mode={dlg.mode} row={dlg.row} availableYears={availableYears} onClose={() => setDlg(null)} onSave={handleSaveSection} />}
    </MasterListPage>
  );
}
