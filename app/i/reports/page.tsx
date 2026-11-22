"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/states";
import { ColumnPicker, ExportPanel, ReportFilters, ReportPreview } from "@/components/reports/report-panels";

type CourseRow = Database["public"]["Views"]["courses"]["Row"];
type StudentRow = Database["public"]["Tables"]["users"]["Row"];
type TestScoreRow = Database["public"]["Tables"]["test_scores"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["submissions"]["Row"];

const COLS: Array<[string, boolean]> = [["ชื่อ-นามสกุล", true], ["รหัสนักศึกษา", true], ["Section", true], ["Pre-test", true], ["Post-test", true], ["คะแนนใบงาน", true], ["คะแนนตาม Rubric (รายเกณฑ์)", false], ["สถานะการส่ง", true], ["วันที่ส่ง", false]];

export default function Reports() {
  const [course, setCourse] = useState<string | null>(null);
  const [format, setFormat] = useState<"all" | "csv">("all");
  const [sel, setSel] = useState<boolean[]>(COLS.map((c) => c[1]));

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [testScores, setTestScores] = useState<TestScoreRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cRes, uRes, tRes, sRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("test_scores").select("*"),
        supabase.from("submissions").select("*"),
      ]);

      setCourses(cRes.data || []);
      setStudents(uRes.data || []);
      setTestScores(tRes.data || []);
      setSubmissions(sRes.data || []);

      if (cRes.data && cRes.data.length > 0) {
        setCourse(cRes.data[0].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const exportToExcel = () => {
    if (students.length === 0) {
      toast.error("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const cObj = courses.find((c) => c.id === course);
    const fileName = cObj ? `${cObj.code}_คะแนนรวม` : "คะแนนรวม";

    const dataToExport = students.map((s) => {
      const r: Partial<TestScoreRow> = testScores.find((x) => x.student_id === s.id) || {};
      const sub: Partial<SubmissionRow> = submissions.find((x) => x.student_id === s.id) || {};

      const row: Record<string, string | number> = {};
      if (sel[0]) row["ชื่อ-นามสกุล"] = s.name;
      if (sel[1]) row["รหัสนักศึกษา"] = s.student_no || "-";
      if (sel[2]) row["Section"] = s.section || "-";
      if (sel[3]) row["Pre-test"] = r.pre ?? "-";
      if (sel[4]) row["Post-test"] = r.post ?? "-";
      if (sel[5]) row["คะแนนใบงาน"] = sub.score ?? "-";
      if (sel[6]) row["คะแนนตาม Rubric (รายเกณฑ์)"] = sub.score != null ? "ประเมินแล้ว" : "-";
      if (sel[7]) row["สถานะการส่ง"] = sub.status === "graded" ? "ตรวจแล้ว" : sub.status === "submitted" ? "ส่งแล้ว" : "ยังไม่ส่ง";
      if (sel[8]) row["วันที่ส่ง"] = sub.submitted_at || "-";

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");

    XLSX.writeFile(workbook, `${fileName}.${format === "csv" ? "csv" : "xlsx"}`);
    toast.success(`ดาวน์โหลด ${fileName}.${format === "csv" ? "csv" : "xlsx"} สำเร็จ`);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader kicker="ระบบหลังบ้าน" title="รายงานและส่งออกคะแนน" description="สรุปผลการเรียน คะแนนแบบทดสอบ และคะแนนใบงาน พร้อมส่งออกเป็นไฟล์ Excel" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="grid gap-4">
          <ReportFilters courses={courses} course={course} onCourseChange={setCourse} />
          <ColumnPicker columns={COLS.map((c) => c[0])} selected={sel} onToggle={(i) => setSel((s) => s.map((v, j) => (j === i ? !v : v)))} />
          <ReportPreview students={students} testScores={testScores} submissions={submissions} />
        </div>
        <ExportPanel
          courseCode={courses.find((c) => c.id === course)?.code || ""}
          rowCount={students.length}
          columnCount={sel.filter(Boolean).length}
          format={format}
          onFormatChange={setFormat}
          onExport={exportToExcel}
        />
      </div>
    </PageContainer>
  );
}
