"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Avatar, Select, statusBadge } from "@/components/ui/Primitives";
import Table from "@/components/ui/Table";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { useSession } from "next-auth/react";
import * as XLSX from "xlsx";

const getStudentSecFromMaster = (studentNo, sectionName, sections) => {
  if (!studentNo || !sectionName || !sections || sections.length === 0) return false;
  const masterSec = sections.find(s => s.name === sectionName);
  if (!masterSec) return false;
  
  const start = masterSec.range_start;
  const end = masterSec.range_end;
  if (!start || !end) return null; // static fallback indicator
  
  const snoStr = String(studentNo).trim();
  if (snoStr.length < 3) return false;
  const last3 = parseInt(snoStr.slice(-3), 10);
  const startVal = parseInt(start, 10);
  const endVal = parseInt(end, 10);
  if (isNaN(last3) || isNaN(startVal) || isNaN(endVal)) return false;
  
  return last3 >= startVal && last3 <= endVal;
};

function ScoresContent() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);
  const { data: session, status } = useSession();

  const lessonId = params?.id;

  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("test"); // test | asg
  
  const [data, setData] = useState({
    questions: [],
    assignments: [],
    submissions: [],
    testScores: [],
    students: [],
    studentGrades: [],
    sectionsList: []
  });

  const loadData = async () => {
    if (!lessonId) return;

    try {
      const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      if (!lData) {
        setLoading(false);
        return;
      }

      const { data: cData } = await supabase.from("courses").select("*").eq("id", lData.course_id).single();

      const [qRes, aRes, subRes, tsRes, stRes, sgRes, secRes] = await Promise.all([
        supabase.from("questions").select("*").eq("lesson_id", lessonId).order("no", { ascending: true }),
        supabase.from("assignments").select("*").eq("lesson_id", lessonId),
        supabase.from("submissions").select("*"),
        supabase.from("test_scores").select("*").eq("lesson_id", lessonId),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("student_grades").select("prefix, year_label"),
        supabase.from("sections").select("*")
      ]);

      let finalSubmissions = subRes.data || [];
      const assignmentIds = aRes.data?.map(a => a.id) || [];
      finalSubmissions = finalSubmissions.filter(sub => assignmentIds.includes(sub.assignment_id));

      setLesson(lData);
      setCourse(cData || { code: "", title: "" });
      setData({
        questions: qRes.data || [],
        assignments: aRes.data || [],
        submissions: finalSubmissions,
        testScores: tsRes.data || [],
        students: stRes.data || [],
        studentGrades: sgRes.data || [],
        sectionsList: secRes?.data || []
      });
    } catch (error) {
      console.error(error);
      toast("เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    loadData();
  }, [lessonId, status]);

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!lesson || !course) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบบทเรียน</div>
            <div className="t-sm muted">ไม่พบบทเรียนตามรหัสที่ระบุ หรือไม่มีอยู่ในฐานข้อมูลของบทเรียนนี้</div>
          </div>
        </div>
      </div>
    );
  }

  // Filter students based on course restrictions
  const courseSection = course.section;
  const allowedYears = course.year_level || [];
  const allowedEmails = course.access?.allowedEmails || [];
  const gradesList = data.studentGrades || [];
  const sectionsList = data.sectionsList || [];
  
  const enrolledStudents = data.students.filter(s => {
    if (allowedEmails.includes(s.email)) {
      return true;
    }
    if (courseSection && courseSection !== "ไม่ระบุ Section") {
      const rangeMatch = getStudentSecFromMaster(s.student_no, courseSection, sectionsList);
      if (rangeMatch === null) {
        if (s.section !== courseSection) return false;
      } else if (!rangeMatch) {
        return false;
      }
    }
    if (allowedYears.length > 0) {
      const prefix = s.student_no ? s.student_no.substring(0, 2) : "";
      const mapping = gradesList.find(g => g.prefix === prefix);
      const studentLabel = mapping ? mapping.year_label : null;
      const studentFallback = s.study_year ? Number(s.study_year) : null;
      
      const hasMatch = allowedYears.some(ay => {
        if (typeof ay === 'number' || !isNaN(Number(ay))) {
           return Number(ay) === studentFallback || ay == studentFallback;
        }
        return ay === studentLabel;
      });

      if (!hasMatch) {
        return false;
      }
    }
    return true;
  });

  const enrolledStudentIds = enrolledStudents.map(s => s.id);
  const enrolledScores = data.testScores.filter(ts => enrolledStudentIds.includes(ts.student_id));

  const preTaken = enrolledScores.filter(ts => ts.pre !== null && ts.pre !== undefined).length;
  const postTaken = enrolledScores.filter(ts => ts.post !== null && ts.post !== undefined).length;

  const preVals = enrolledScores.map(ts => ts.pre).filter(v => v !== null && v !== undefined);
  const avgPre = preVals.length > 0 ? (preVals.reduce((a, b) => a + b, 0) / preVals.length).toFixed(1) : "—";

  const postVals = enrolledScores.map(ts => ts.post).filter(v => v !== null && v !== undefined);
  const avgPost = postVals.length > 0 ? (postVals.reduce((a, b) => a + b, 0) / postVals.length).toFixed(1) : "—";

  // Export to Excel handler
  const handleExportExcel = () => {
    const exportData = enrolledStudents.map(s => {
      const ts = enrolledScores.find(ts => ts.student_id === s.id) || {};
      const subList = data.submissions.filter(sub => sub.student_id === s.id);
      
      const row = {
        "รหัสนักศึกษา": s.student_no || "-",
        "ชื่อ-นามสกุล": s.name || "-",
        "อีเมล": s.email || "-",
        "Section": s.section || "-",
        "Pre-test Score": ts.pre !== undefined && ts.pre !== null ? `${ts.pre}/${ts.total || 0}` : "ยังไม่ทำ",
        "Post-test Score": ts.post !== undefined && ts.post !== null ? `${ts.post}/${ts.total || 0}` : "ยังไม่ทำ",
        "พัฒนาการ": ts.post != null && ts.pre != null ? ts.post - ts.pre : "—"
      };

      // Add assignment scores dynamic columns
      data.assignments.forEach((asg, idx) => {
        const sub = subList.find(sub => sub.assignment_id === asg.id);
        row[`ใบงาน: ${asg.title}`] = sub ? (sub.score !== null ? `${sub.score}/${sub.total}` : "ยังไม่ได้ตรวจ") : "ยังไม่ส่ง";
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "คะแนนนักศึกษา");
    XLSX.writeFile(workbook, `คะแนน_${course.code}_บทที่_${lesson.index}.xlsx`);
    toast("ส่งออกไฟล์คะแนนสำเร็จ", "success");
  };

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[
        { label: "รายวิชา", to: "/i/courses" },
        { label: course.code, to: "/i/course/" + course.id },
        { label: "บทที่ " + lesson.index, to: "/i/lesson/" + lesson.id },
        { label: "คะแนนนักศึกษา" }
      ]} />
      
      <PageHead 
        kicker={`${course.code} · บทที่ ${lesson.index}`} 
        title={`รายงานคะแนนนักศึกษา: ${lesson.title}`} 
        right={
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => nav("/i/lesson/" + lesson.id)}>
              <Icon name="arrL" size={16} />กลับสู่บทเรียน
            </button>
            <button className="btn btn-primary" onClick={handleExportExcel}>
              <Icon name="download" size={16} />ส่งออกเป็น Excel
            </button>
          </div>
        }
      />

      <div className="flex items-center justify-between mb-4 wrap gap-2">
        <div className="tabs pill">
          <button className={view === "test" ? "on" : ""} onClick={() => setView("test")}><Icon name="clipboard" size={15} /> คะแนน Pre/Post-test</button>
          <button className={view === "asg" ? "on" : ""} onClick={() => setView("asg")}><Icon name="file" size={15} /> คะแนนใบงาน</button>
        </div>
      </div>

      {view === "test" ? (
        <>
          <div className="grid grid-4 gap-3 mb-4">
            {[
              ["ทำ Pre-test แล้ว", `${preTaken}/${enrolledStudents.length} คน`, "clipboard"],
              ["ทำ Post-test แล้ว", `${postTaken}/${enrolledStudents.length} คน`, "checkC"],
              ["คะแนนเฉลี่ย Pre-test", `${avgPre} คะแนน`, "chart"],
              ["คะแนนเฉลี่ย Post-test", `${avgPost} คะแนน`, "chart"]
            ].map((s, i) => (
              <div key={i} className="card card-p" style={{ padding: "16px 20px" }}>
                <div className="t-xs muted flex items-center gap-1"><Icon name={s[2]} size={14} className="c-primary" />{s[0]}</div>
                <div className="t-2xl fw-7 tnum mt-1">{s[1]}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-h flex items-center justify-between">
              <div className="title">ตารางคะแนนแบบทดสอบ</div>
              <div className="desc">แสดงคะแนนการทำแบบทดสอบก่อนเรียนและหลังเรียนของนักศึกษาที่มีสิทธิ์ในรายวิชา</div>
            </div>
            <Table
              className="table"
              headers={[
                "นักศึกษา",
                <span className="hide-m" key="sec">Section</span>,
                "Pre-test",
                "Post-test",
                "พัฒนาการ"
              ]}
              data={enrolledScores}
              colSpan={5}
              renderRow={(r) => {
                const s = enrolledStudents.find(student => student.id === r.student_id) || { name: "Unknown", student_no: "-", section: "-" };
                const diff = r.post != null && r.pre != null ? r.post - r.pre : null;
                return (
                  <tr key={r.student_id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={s.name} size={28} />
                        <div>
                          <div className="fw-6 t-sm">{s.name}</div>
                          <div className="t-xs muted">{s.student_no}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-m"><Badge tone="outline">{s.section || "-"}</Badge></td>
                    <td>{r.pre != null ? <span className="num fw-6">{r.pre}/{r.total}</span> : <span className="muted t-sm">ยังไม่ทำ</span>}</td>
                    <td>{r.post != null ? <span className="num fw-6">{r.post}/{r.total}</span> : <span className="muted t-sm">ยังไม่ทำ</span>}</td>
                    <td>{diff != null ? <Badge tone={diff > 0 ? "success" : "muted"} dot>{diff > 0 ? "+" : ""}{diff}</Badge> : <span className="muted t-sm">—</span>}</td>
                  </tr>
                );
              }}
            />
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-h flex items-center justify-between">
            <div className="title">รายการส่งใบงานนักศึกษา</div>
            <div className="desc">แสดงรายการส่งใบงานและคะแนนของนักศึกษาที่มีสิทธิ์ในรายวิชา</div>
          </div>
          <Table
            className="table"
            headers={[
              "นักศึกษา",
              "ใบงาน",
              "สถานะ",
              <span className="hide-m" key="sentAt">ส่งเมื่อ</span>,
              "คะแนน"
            ]}
            data={data.submissions}
            colSpan={5}
            renderRow={(sub) => {
              const s = enrolledStudents.find(student => student.id === sub.student_id) || { name: "Unknown", student_no: "-" };
              const asg = data.assignments.find(a => a.id === sub.assignment_id) || { title: "ใบงานประกอบบทเรียน" };
              return (
                <tr key={sub.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.name} size={26} />
                      <div>
                        <div className="fw-6 t-sm">{s.name}</div>
                        <div className="t-xs muted">{s.student_no}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="t-sm fw-5">{asg.title}</span></td>
                  <td>{statusBadge(sub.status)}</td>
                  <td className="hide-m muted t-sm">{sub.submitted_at || "—"}</td>
                  <td>{sub.score != null ? <span className="num fw-6">{sub.score}/{sub.total}</span> : <span className="muted t-sm">—</span>}</td>
                </tr>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function LessonScoresPage() {
  return (
    <Suspense fallback={<Loading className="container p-5 text-center muted" />}>
      <ScoresContent />
    </Suspense>
  );
}
