"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import { useConfirm } from "@/components/common/confirm";
import { MasterListPage, useConfirmDelete } from "@/components/master/list-page";
import { gradeColumns, type GradeTableRow } from "@/components/master/studentgrade/columns";
import { GradeDialog, type GradeSaveInput, type StudentGradeRow } from "@/components/master/studentgrade/grade-dialog";

type GradeDialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: StudentGradeRow };

export default function MasterStudentGradePage() {
  const [gradesList, setGradesList] = useState<StudentGradeRow[]>([]);
  const [domains, setDomains] = useState<string[]>([]); // allowed_domains
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete("การดำเนินการนี้จะลบการเชื่อมโยงชั้นปีนี้ออกจากระบบ กรุณาตรวจสอบก่อนดำเนินการต่อ");
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<GradeDialogState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadData = async () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const load = async () => {
      const [{ data, error }, { data: ad }] = await Promise.all([
        supabase.from("student_grades").select("*").order("prefix", { ascending: false }),
        supabase.from("allowed_domains").select("domain"),
      ]);
      setDomains((ad || []).map((d) => d.domain));

      if (!error) {
        setGradesList(data || []);
      } else {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message);
      }
      setLoading(false);
    };
    load();
  }, [reloadKey]);

  const handleSaveGrade = async (gradeData: GradeSaveInput) => {
    if (!dlg) return;
    const currentDlg = dlg;
    setDlg(null);
    if (currentDlg.mode === "add") {
      const { newDomain, ...fields } = gradeData;
      const newGrade = {
        id: "sg_" + Date.now(),
        ...fields,
      };
      if (newDomain) {
        // Saving the first year level of a new domain ALLOWS that domain to sign in (tutor mode only): ask first.
        const ok = await confirm({
          title: "เพิ่มโดเมนภายนอก",
          message: `อนุญาตให้ผู้ใช้อีเมล @${newGrade.domain} ล็อกอินด้วย Google ได้ (เข้าได้เฉพาะชุดติว Tutor)\n\nยืนยันเพิ่มโดเมน ${newGrade.domain} ใช่หรือไม่?`,
          confirmText: "ยืนยัน เพิ่มโดเมน", cancelText: "ยกเลิก",
        });
        if (!ok) return;
        // The year level references allowed_domains (FK), so the domain goes in first; if the year level then fails the
        // domain is taken out again, so a failed save never leaves a domain that may sign in with no year level behind.
        const { error: dErr } = await supabase.from("allowed_domains").insert([{ domain: newGrade.domain }]);
        if (dErr) {
          toast.error("เพิ่มโดเมนไม่สำเร็จ: " + dErr.message);
          return;
        }
        const { error: gErr } = await supabase.from("student_grades").insert([newGrade]);
        if (gErr) {
          const { error: undoErr } = await supabase.from("allowed_domains").delete().eq("domain", newGrade.domain);
          toast.error("เกิดข้อผิดพลาดในการบันทึก: " + gErr.message + (undoErr ? ` (ถอนโดเมน ${newGrade.domain} ไม่สำเร็จ กรุณาลบเอง: ${undoErr.message})` : ""));
          return;
        }
        toast.success("เพิ่มโดเมนและการกำหนดชั้นปีเรียบร้อยแล้ว");
        await loadData(); // year_no (the lock key) is assigned by the database
        return;
      }
      const { error } = await supabase.from("student_grades").insert([newGrade]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      } else {
        toast.success("บันทึกการกำหนดชั้นปีเรียบร้อยแล้ว");
        await loadData();
      }
    } else {
      const { error } = await supabase
        .from("student_grades")
        .update({ year_label: gradeData.year_label })
        .eq("id", currentDlg.row.id);

      if (error) {
        toast.error("เกิดข้อผิดพลาดในการบันทึก: " + error.message);
      } else {
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
        await loadData(); // a rename may have changed year_no
      }
    }
  };

  const handleDeleteGrade = async (g: GradeTableRow) => {
    const desc = g.prefix
      ? `คุณต้องการลบสิทธิ์การเชื่อมโยงของรหัส "${g.prefix}" หรือไม่?`
      : `คุณต้องการลบสิทธิ์การเชื่อมโยงของทุกคนในโดเมน ${g.domainKey} หรือไม่?`;
    if (!(await confirmDelete("ลบการกำหนดชั้นปี", desc))) return;
    const { error } = await supabase.from("student_grades").delete().eq("id", g.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบข้อมูล: " + error.message);
    } else {
      setGradesList((prev) => prev.filter((r) => r.id !== g.id));
      toast.success("ลบการกำหนดชั้นปีเรียบร้อยแล้ว");
    }
  };

  const rows = useMemo<GradeTableRow[]>(
    () =>
      gradesList.map((g) => ({
        ...g,
        scopeText: g.prefix === "" ? "ทั้งโดเมน" : g.prefix,
        domainKey: g.domain || DEFAULT_DOMAIN,
      })),
    [gradesList],
  );

  const domainOptions = useMemo(
    () => [...new Set([DEFAULT_DOMAIN, ...domains])].map((d) => ({ value: d, label: d })),
    [domains],
  );
  const yearOptions = useMemo(
    () => Array.from(new Set(gradesList.map((g) => g.year_label))).sort().map((l) => ({ value: l, label: l })),
    [gradesList],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters, confirm and the supabase client
  const columns = useMemo(() => gradeColumns((row) => setDlg({ mode: "edit", row }), handleDeleteGrade), []);

  return (
    <MasterListPage
      title="กำหนดชั้นปีนักศึกษา"
      description="จัดการการจับคู่ตัวเลขรหัสนักศึกษา 2 หลักแรกเข้ากับระดับชั้นปีการศึกษา"
      note="ความเชื่อมโยงของรหัสนักศึกษา (เช่น รหัสที่ขึ้นต้นด้วย 66 จะเป็นนักศึกษาชั้นปีที่ 2)"
      addLabel="เพิ่มการจับคู่"
      onAdd={() => setDlg({ mode: "add" })}
      filters={[
        { column: "domainKey", options: domainOptions, allLabel: "โดเมน: ทั้งหมด" },
        { column: "year_label", options: yearOptions, allLabel: "ระดับชั้นปี: ทั้งหมด" },
      ]}
      data={rows}
      columns={columns}
      loading={loading}
      searchKeys={["scopeText", "year_label", "domain"]}
      searchPlaceholder="ค้นหาเลขรหัส หรือ ชั้นปี..."
      emptyTitle="ยังไม่มีการกำหนดชั้นปี"
    >
      {dlg && <GradeDialog mode={dlg.mode} row={dlg.row} grades={gradesList} domains={domains} onClose={() => setDlg(null)} onSave={handleSaveGrade} />}
    </MasterListPage>
  );
}
