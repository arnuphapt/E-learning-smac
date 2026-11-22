"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MasterListPage, useConfirmDelete } from "@/components/master/list-page";
import { yearColumns } from "@/components/master/years/columns";
import { YearDialog, type AcademicYearRow, type YearSaveInput } from "@/components/master/years/year-dialog";

type YearDialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: AcademicYearRow };

export default function MasterYearsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<YearDialogState | null>(null);
  const confirmDelete = useConfirmDelete();

  
  useEffect(() => {
    const load = async () => {
      const [yRes, cRes] = await Promise.all([
        supabase.from("academic_years").select("*").order("year", { ascending: false }),
        supabase.from("courses").select("id, year")
      ]);
      if (!yRes.error) {
        const courses = cRes.data || [];
        const years: AcademicYearRow[] = (yRes.data || []).map((y) => ({
          ...y,
          courses: courses.filter((c) => String(c.year) === String(y.year)).length
        }));
        setAcademicYears(years);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveYear = async (updatedYear: YearSaveInput) => {
    if (!dlg) return;
    const currentDlg = dlg;
    setDlg(null);
    if (currentDlg.mode === "add") {
      const newYearObj: AcademicYearRow = {
        id: "y_" + Date.now(),
        ...updatedYear
      };
      const { error } = await supabase.from("academic_years").insert([newYearObj]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการสร้างปีการศึกษา: " + error.message);
      } else {
        setAcademicYears((prev) => [newYearObj, ...prev].sort((a, b) => (b.year || "").localeCompare(a.year || "")));
        toast.success("เพิ่มปีการศึกษาเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("academic_years").update(updatedYear).eq("id", currentDlg.row.id);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการแก้ไขปีการศึกษา: " + error.message);
      } else {
        setAcademicYears((prev) => prev.map((y) => (y.id === currentDlg.row.id ? { ...y, ...updatedYear } : y)));
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleDeleteYear = async (y: AcademicYearRow) => {
    if (!(await confirmDelete("ลบปีการศึกษา", `คุณต้องการลบ "${y.label}" หรือไม่?`))) return;
    const { error } = await supabase.from("academic_years").delete().eq("id", y.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบปีการศึกษา: " + error.message);
    } else {
      setAcademicYears((prev) => prev.filter((r) => r.id !== y.id));
      toast.success("ลบปีการศึกษาเรียบร้อยแล้ว");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters and the supabase client
  const columns = useMemo(() => yearColumns((row) => setDlg({ mode: "edit", row }), handleDeleteYear), []);

  return (
    <MasterListPage
      title="ปีการศึกษา"
      description="จัดการปีการศึกษาและช่วงเวลาเปิดเรียนในระบบ"
      note="กำหนดปีการศึกษาและช่วงเวลา ปีที่ตั้งเป็น “ใช้งาน” จะเป็นค่าเริ่มต้นของระบบ"
      addLabel="เพิ่มปีการศึกษา"
      onAdd={() => setDlg({ mode: "add" })}
      data={academicYears}
      columns={columns}
      loading={loading}
      searchKeys={["label", "start_date", "end_date"]}
      searchPlaceholder="ค้นหาปีการศึกษา…"
      emptyTitle="ยังไม่มีปีการศึกษา"
    >
      {dlg && <YearDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={handleSaveYear} />}
    </MasterListPage>
  );
}
