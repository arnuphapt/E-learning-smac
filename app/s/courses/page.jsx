"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, Select } from "@/components/ui/Primitives";
import Loading from "@/components/ui/Loading";

function PageHead({ kicker, title, desc, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 wrap">
      <div>
        {kicker && <div className="t-xs fw-6 uppercase c-primary mb-1">{kicker}</div>}
        <div className="t-3xl fw-7 serif" style={{ color: "var(--fg)", letterSpacing: "-.01em" }}>{title}</div>
        {desc && <div className="muted mt-1 pretty" style={{ maxWidth: 620 }}>{desc}</div>}
      </div>
      {right}
    </div>
  );
}

function CourseCard({ c, nav }) {
  return (
    <div className="card pointer" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={() => nav("/s/course/" + c.id)}>
      <div style={{ height: 76, background: `linear-gradient(120deg, ${c.hero}, ${c.hero}cc)`, position: "relative", display: "flex", alignItems: "center", padding: "0 18px" }}>
        <span className="badge" style={{ background: "rgba(255,255,255,.22)", color: "#fff", fontWeight: 700 }}>{c.code}</span>
        <Icon name="layers" size={56} style={{ position: "absolute", right: -6, top: 8, color: "rgba(255,255,255,.18)" }} />
      </div>
      <div className="card-p flex-1 flex col">
        <div className="t-md fw-7 serif" style={{ letterSpacing: "-.01em" }}>{c.title}</div>
        <div className="muted t-sm mt-1 pretty" style={{ minHeight: 36 }}>{c.subtitle}</div>
        <div className="flex items-center gap-2 mt-3 t-xs muted"><Icon name="user" size={14} />{c.instructor}</div>
        <div className="mt-4">
          <div className="flex items-center justify-between t-xs mb-1"><span className="muted">ความคืบหน้า</span><span className="fw-6 tnum">{c.progress}%</span></div>
          <Progress value={c.progress} />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="t-xs muted flex items-center gap-1"><Icon name="book" size={14} />{c.lessons} บทเรียน</div>
          <span className="btn btn-soft btn-sm">{c.progress >= 100 ? "ทบทวน" : c.progress > 0 ? "เรียนต่อ" : "เริ่มเรียน"}<Icon name="arrR" size={15} /></span>
        </div>
      </div>
    </div>
  );
}

function CourseListItem({ c, nav }) {
  return (
    <div className="card pointer" style={{ display: "flex", alignItems: "stretch", overflow: "hidden" }} onClick={() => nav("/s/course/" + c.id)}>
      <div style={{ flex: "0 0 8px", background: `linear-gradient(${c.hero}, ${c.hero}aa)` }} />
      <div className="card-p flex items-center gap-4 flex-1 course-list-item-p">
        <div className="course-icon-badge" style={{ width: 46, height: 46, borderRadius: 11, background: c.hero, color: "#fff", display: "grid", placeItems: "center", flex: "0 0 46px", fontWeight: 700, fontSize: 12 }}>{c.code.replace(/[^0-9]/g, "").slice(0, 3)}</div>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2 wrap"><span className="fw-7 t-base">{c.title}</span><Badge tone="outline">{c.code}</Badge></div>
          <div className="t-xs muted mt-1 truncate">{c.subtitle}</div>
          <div className="flex items-center gap-2 mt-1 t-xs muted wrap"><span className="flex items-center gap-1"><Icon name="user" size={12} />{c.instructor}</span><i className="dot-sep" /><span className="flex items-center gap-1"><Icon name="book" size={12} />{c.lessons} บทเรียน</span><i className="dot-sep" /><span>{c.term}</span></div>
        </div>
        <div style={{ width: 140 }} className="hide-m">
          <div className="flex items-center justify-between t-xs mb-1"><span className="muted">ความคืบหน้า</span><span className="fw-6 tnum">{c.progress}%</span></div>
          <Progress value={c.progress} h={6} />
        </div>
        <span className="btn btn-soft btn-sm flex-0">{c.progress >= 100 ? "ทบทวน" : c.progress > 0 ? "เรียนต่อ" : "เริ่มเรียน"}<Icon name="arrR" size={15} /></span>
      </div>
    </div>
  );
}

export default function StudentCourses() {
  const router = useRouter();
  const { data: session } = useSession();
  const studentId = session?.dbId;
  const role = session?.user?.role;
  const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null;
  const KEY = "nl_course_view";
  
  // Use a safe initialization for view
  const [view, setView] = React.useState("grid");
  const [year, setYear] = React.useState("all");
  const [courses, setCourses] = React.useState([]);
  const [years, setYears] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setView(localStorage.getItem(KEY) || "grid");
    
    async function loadData() {
      const [cRes, yRes, lRes, sgRes, uRes, secRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("academic_years").select("*").order("year", { ascending: false }),
        supabase.from("lessons").select("id, course_id, status"),
        supabase.from("student_grades").select("prefix, year_label"),
        studentId ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("sections").select("*")
      ]);
      
      const cData = cRes.data;
      const yData = yRes.data;
      const lData = lRes.data;
      const sgData = sgRes.data;
      const studentProfile = uRes?.data;
      const sectionsList = secRes?.data || [];
      
      if (cData) {
        const isStaff = role === "instructor" || role === "admin";
        const visibleLessons = lData ? lData.filter(l => l.status !== "draft") : [];

        const mappedCourses = cData.map(c => {
          const courseLessons = visibleLessons.filter(l => l.course_id === c.id);
          const lessonsCount = courseLessons.length;
          
          let progress = 0;
          if (studentId && lessonsCount > 0 && typeof window !== "undefined") {
            const totalProgress = courseLessons.reduce((acc, l) => {
              const saved = localStorage.getItem(`watch_progress_${studentId}_${l.id}`);
              const val = saved ? parseInt(saved, 10) : 0;
              return acc + val;
            }, 0);
            progress = Math.round(totalProgress / lessonsCount);
          }

          return {
            ...c,
            lessons: lessonsCount,
            progress: progress
          };
        });

        const getStudentSecFromMaster = (studentNo, sectionName, sections) => {
          if (!studentNo || !sectionName || !sections || sections.length === 0) return false;
          const masterSec = sections.find(s => s.name === sectionName);
          if (!masterSec) return false;
          
          const start = masterSec.range_start;
          const end = masterSec.range_end;
          if (!start || !end) return null; // indicates static check fallback
          
          const snoStr = String(studentNo).trim();
          if (snoStr.length < 3) return false;
          const last3 = parseInt(snoStr.slice(-3), 10);
          const startVal = parseInt(start, 10);
          const endVal = parseInt(end, 10);
          if (isNaN(last3) || isNaN(startVal) || isNaN(endVal)) return false;
          
          return last3 >= startVal && last3 <= endVal;
        };

        const gradesList = sgData || [];
        const email = session?.user?.email || "";
        const match = email.match(/^(\d+)@/);
        const parsedStudentNo = match ? match[1] : "";
        const finalStudentNo = studentProfile?.student_no || parsedStudentNo;
        const finalStudentSec = studentProfile?.section || "";

        const prefix = match ? match[1].substring(0, 2) : "";
        const mapping = gradesList.find(g => g.prefix === prefix);
        const studentLabel = mapping ? mapping.year_label : null;
        const studentFallback = studentYear;

        // Filter by year_level & master sectionRanges access control (staff sees all)
        const filtered = isStaff ? mappedCourses : mappedCourses.filter(c => {
          const allowedEmails = c.access?.allowedEmails || [];
          if (allowedEmails.includes(email)) return true;

          // Check section ranges or fallback to profile section comparison
          if (c.section && c.section !== "ไม่ระบุ Section") {
            const rangeMatch = getStudentSecFromMaster(finalStudentNo, c.section, sectionsList);
            if (rangeMatch === null) {
              // Static fallback check
              if (finalStudentSec !== c.section) return false;
            } else if (!rangeMatch) {
              return false;
            }
          }

          const allowed = c.year_level;
          if (!allowed || allowed.length === 0) return true; // no restriction
          
          const hasMatch = allowed.some(ay => {
            if (typeof ay === 'number' || !isNaN(Number(ay))) {
               return Number(ay) === studentFallback || ay == studentFallback;
            }
            return ay === studentLabel;
          });
          return hasMatch;
        });

        setCourses(filtered);
      }
      if (yData) setYears(yData);
      setLoading(false);
    }
    loadData();
  }, [studentId, role]);

  const setV = (v) => { setView(v); try { localStorage.setItem(KEY, v); } catch (e) {} };
  const list = courses.filter((c) => year === "all" || c.year === year);
  
  const nav = (path) => router.push(path);

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead
        kicker="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        title="รายวิชาของฉัน"
        desc="เลือกรายวิชาเพื่อเข้าเรียนบทเรียน ทำแบบทดสอบ และส่งใบงาน"
      />

      {/* toolbar: year filter + view toggle */}
      <div className="flex items-center justify-between gap-3 mb-4 wrap">
        <div className="flex items-center gap-2">
          <span className="t-sm muted flex items-center gap-1"><Icon name="filter" size={15} />ปีการศึกษา</span>
          <Select className="input" style={{ width: 190, height: 36 }} value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">ทุกปีการศึกษา</option>
            {years.map((y) => <option key={y.id} value={y.year}>{y.label}{y.status === "active" ? " (ปัจจุบัน)" : ""}</option>)}
          </Select>
          <span className="t-sm muted ml-2">{list.length} รายวิชา</span>
        </div>
        <div className="proto-seg" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
          <button className={view === "grid" ? "on" : ""} onClick={() => setV("grid")} style={{ color: view === "grid" ? "#fff" : "var(--muted-fg)" }}><Icon name="grid" size={14} />ตาราง</button>
          <button className={view === "list" ? "on" : ""} onClick={() => setV("list")} style={{ color: view === "list" ? "#fff" : "var(--muted-fg)" }}><Icon name="listChk" size={14} />รายการ</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="book" size={24} /></div>
          <div><div className="fw-6 fg">ไม่มีรายวิชาในปีการศึกษานี้</div><div className="t-sm mt-1">ลองเลือกปีการศึกษาอื่น หรือดูทุกปีการศึกษา</div></div>
          <button className="btn btn-outline btn-sm" onClick={() => setYear("all")}>ดูทุกปีการศึกษา</button>
        </div></div>
      ) : view === "grid" ? (
        <div className="grid grid-3 gap-4">{list.map((c) => <CourseCard key={c.id} c={c} nav={nav} />)}</div>
      ) : (
        <div className="flex col gap-3">{list.map((c) => <CourseListItem key={c.id} c={c} nav={nav} />)}</div>
      )}
    </div>
  );
}
