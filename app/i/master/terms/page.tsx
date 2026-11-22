"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MasterListPage, useConfirmDelete } from "@/components/master/list-page";
import { termColumns } from "@/components/master/terms/columns";
import { TermDialog, type TermRow, type TermSaveInput } from "@/components/master/terms/term-dialog";
import type { AcademicYearRow } from "@/components/master/years/year-dialog";

type TermDialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: TermRow };

export default function MasterTermsPage() {
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<TermDialogState | null>(null);
  const confirmDelete = useConfirmDelete();

  useEffect(() => {
    const load = async () => {
      const [tRes, yRes] = await Promise.all([
        supabase.from("terms").select("*"),
        supabase.from("academic_years").select("*").order("year", { ascending: false })
      ]);
      if (!tRes.error) setTerms(tRes.data || []);
      if (!yRes.error) setAcademicYears(yRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveTerm = async (updatedTerm: TermSaveInput) => {
    if (!dlg) return;
    const currentDlg = dlg;
    setDlg(null);
    if (currentDlg.mode === "add") {
      const obj: TermRow = { id: "t_" + Date.now(), ...updatedTerm };
      const { error } = await supabase.from("terms").insert([obj]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการสร้างภาคเรียน: " + error.message);
      } else {
        setTerms((prev) => [...prev, obj]);
        toast.success("เพิ่มภาคเรียนเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("terms").update(updatedTerm).eq("id", currentDlg.row.id);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการแก้ไขภาคเรียน: " + error.message);
      } else {
        setTerms((prev) => prev.map((t) => (t.id === currentDlg.row.id ? { ...t, ...updatedTerm } : t)));
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleDeleteTerm = async (t: TermRow) => {
    if (!(await confirmDelete("ลบภาคเรียน", `คุณต้องการลบ "${t.name} ${t.year}" หรือไม่?`))) return;
    const { error } = await supabase.from("terms").delete().eq("id", t.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบภาคเรียน: " + error.message);
    } else {
      setTerms((prev) => prev.filter((r) => r.id !== t.id));
      toast.success("ลบภาคเรียนเรียบร้อยแล้ว");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters and the supabase client
  const columns = useMemo(() => termColumns((row) => setDlg({ mode: "edit", row }), handleDeleteTerm), []);

  return (
    <MasterListPage
      title="ภาคเรียน"
      description="จัดการภาคเรียนในแต่ละปีการศึกษา"
      note="ภาคการศึกษาภายใต้แต่ละปีการศึกษา"
      addLabel="เพิ่มภาคเรียน"
      onAdd={() => setDlg({ mode: "add" })}
      data={terms}
      columns={columns}
      loading={loading}
      searchKeys={["name", "year", "start_date", "end_date"]}
      searchPlaceholder="ค้นหาภาคเรียน…"
      emptyTitle="ยังไม่มีภาคเรียน"
    >
      {dlg && <TermDialog mode={dlg.mode} row={dlg.row} academicYears={academicYears} onClose={() => setDlg(null)} onSave={handleSaveTerm} />}
    </MasterListPage>
  );
}
