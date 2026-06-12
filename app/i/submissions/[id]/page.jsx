"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Avatar, statusBadge, Badge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";

export default function SubmissionList() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const asgId = params?.id;
  
  const [a, setA] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [subs, setSubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [gradesList, setGradesList] = useState([]);
  const [filter, setFilter] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!asgId) return;
      const { data: aData } = await supabase.from("assignments").select("*").eq("id", asgId).single();
      if (!aData) { setLoading(false); return; }
      
      const [lRes, cRes, subRes, stRes, gRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("id", aData.lesson_id).single(),
        supabase.from("courses").select("*").eq("id", aData.course_id).single(),
        supabase.from("submissions").select("*").eq("assignment_id", asgId),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("student_grades").select("*")
      ]);
      
      setA(aData);
      setLesson(lRes.data || { id: "l1", index: 1 });
      setCourse(cRes.data || { id: "c1", code: "Unknown" });
      setSubs(subRes.data || []);
      setStudents(stRes.data || []);
      setGradesList(gRes.data || []);
      setLoading(false);
    }
    load();
  }, [asgId]);

  const enrichedSubs = React.useMemo(() => {
    return subs.map((sub) => {
      const s = students.find((st) => st.id === sub.student_id) || { name: "Unknown", student_no: "-", section: "-" };
      const prefix = String(s.student_no).slice(0, 2);
      const gradeMapping = gradesList.find((g) => g.prefix === prefix);
      const yearLabel = gradeMapping ? gradeMapping.year_label : "ไม่ระบุชั้นปี";
      return {
        ...sub,
        studentName: s.name,
        studentNo: s.student_no,
        section: s.section,
        yearLabel: yearLabel,
      };
    });
  }, [subs, students, gradesList]);

  const filteredForCounts = React.useMemo(() => {
    return enrichedSubs.filter((sub) => {
      if (filterSection !== "all" && sub.section !== filterSection) return false;
      if (filterGrade !== "all" && sub.yearLabel !== filterGrade) return false;
      return true;
    });
  }, [enrichedSubs, filterSection, filterGrade]);

  const counts = React.useMemo(() => {
    return {
      all: filteredForCounts.length,
      submitted: filteredForCounts.filter((s) => s.status === "submitted" || s.status === "late").length,
      graded: filteredForCounts.filter((s) => s.status === "graded").length,
      "not-submitted": filteredForCounts.filter((s) => s.status === "not-submitted").length,
    };
  }, [filteredForCounts]);

  const filteredList = React.useMemo(() => {
    return enrichedSubs.filter((sub) => {
      if (filter !== "all") {
        if (filter === "submitted") {
          if (sub.status !== "submitted" && sub.status !== "late") return false;
        } else {
          if (sub.status !== filter) return false;
        }
      }
      if (filterSection !== "all" && sub.section !== filterSection) return false;
      if (filterGrade !== "all" && sub.yearLabel !== filterGrade) return false;
      return true;
    });
  }, [enrichedSubs, filter, filterSection, filterGrade]);

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!a) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบใบงาน</div>
            <div className="t-sm muted">ไม่พบใบงานตามรหัสที่ระบุ หรือข้อมูลใบงานนี้ไม่มีอยู่ในระบบ</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: course.code, to: "/i/course/" + course.id }, { label: "บทที่ " + lesson.index, to: "/i/lesson/" + lesson.id }, { label: "การส่งงาน" }]} />
      <PageHead kicker={"ใบงาน · " + course.code} title={a.title}
        right={<button className="btn btn-soft" onClick={() => nav("/i/reports")}><Icon name="excel" size={16} />ส่งออก Excel</button>} />

      <div className="grid grid-4 gap-3 mb-4">
        {[["ทั้งหมด", counts.all, "all", "users"], ["รอตรวจ", counts.submitted, "submitted", "clock"], ["ตรวจแล้ว", counts.graded, "graded", "checkC"], ["ยังไม่ส่ง", counts["not-submitted"], "not-submitted", "alert"]].map((s) => (
          <button key={s[2]} className="card card-p flex items-center gap-3 pointer" style={{ textAlign: "left", borderColor: filter === s[2] ? "var(--primary)" : "var(--border)", boxShadow: filter === s[2] ? "0 0 0 3px rgba(13,110,140,.1)" : "" }} onClick={() => setFilter(s[2])}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: filter === s[2] ? "var(--primary)" : "var(--muted)", color: filter === s[2] ? "#fff" : "var(--muted-fg)", display: "grid", placeItems: "center" }}><Icon name={s[3]} size={17} /></div>
            <div><div className="t-2xl fw-7 tnum" style={{ lineHeight: 1 }}>{s[1]}</div><div className="t-xs muted mt-1">{s[0]}</div></div>
          </button>
        ))}
      </div>

      <Table
        title={<>รายการส่งงาน {filter !== "all" && <span className="muted fw-4">({filteredList.length})</span>}</>}
        className="table hover"
        enableSearch={true}
        searchKeys={["studentName", "studentNo"]}
        searchPlaceholder="ค้นหานักศึกษา..."
        filter={
          <>
            <select
              className="input"
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              style={{ width: 160, height: 38, padding: "0 12px", fontSize: 13, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8 }}
            >
              <option value="all">กลุ่ม: ทั้งหมด</option>
              {Array.from(new Set(enrichedSubs.map((s) => s.section))).filter(Boolean).sort().map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>

            <select
              className="input"
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              style={{ width: 160, height: 38, padding: "0 12px", fontSize: 13, background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8 }}
            >
              <option value="all">ชั้นปี: ทั้งหมด</option>
              {Array.from(new Set(gradesList.map((g) => g.year_label))).sort().map((lbl) => (
                <option key={lbl} value={lbl}>{lbl}</option>
              ))}
            </select>
          </>
        }
        headers={[
          "นักศึกษา",
          "กลุ่มเรียน",
          "ชั้นปี",
          "สถานะ",
          <span className="hide-m" key="file">ไฟล์งาน</span>,
          <span className="hide-m" key="sentAt">ส่งเมื่อ</span>,
          "คะแนน",
          ""
        ]}
        data={filteredList}
        colSpan={8}
        renderRow={(sub) => {
          const can = sub.status !== "not-submitted";
          return (
            <tr key={sub.id} onClick={() => can && nav("/i/grade/" + sub.id)} style={{ cursor: can ? "pointer" : "default", opacity: can ? 1 : .65 }}>
              <td>
                <div className="flex items-center gap-2">
                  <Avatar name={sub.studentName} size={30} />
                  <div>
                    <div className="fw-6">{sub.studentName}</div>
                    <div className="t-xs muted">{sub.studentNo || "-"}</div>
                  </div>
                </div>
              </td>
              <td>
                {sub.section && sub.section !== "ไม่มี" ? (
                  <Badge tone="outline">{sub.section}</Badge>
                ) : (
                  <span className="muted t-sm">-</span>
                )}
              </td>
              <td className="t-sm">{sub.yearLabel}</td>
              <td>{statusBadge(sub.status)}</td>
              <td className="hide-m">{sub.file ? <span className="flex items-center gap-2 t-sm c-primary"><Icon name="file" size={15} />{sub.file}</span> : <span className="muted t-sm">—</span>}</td>
              <td className="hide-m muted t-sm">{sub.submitted_at || "—"}</td>
              <td>{sub.score != null ? <span className="num fw-7">{sub.score}/{sub.total}</span> : can ? <span className="muted t-sm">รอตรวจ</span> : <span className="muted t-sm">—</span>}</td>
              <td>{can && <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); nav("/i/grade/" + sub.id); }}>{sub.status === "graded" ? "แก้คะแนน" : "ตรวจงาน"}</button>}</td>
            </tr>
          );
        }}
      />
    </div>
  );
}
