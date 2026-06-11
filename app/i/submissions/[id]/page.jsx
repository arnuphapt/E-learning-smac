"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Avatar, statusBadge } from "@/components/ui/Primitives";
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
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!asgId) return;
      const { data: aData } = await supabase.from("assignments").select("*").eq("id", asgId).single();
      if (!aData) { setLoading(false); return; }
      
      const [lRes, cRes, subRes, stRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("id", aData.lesson_id).single(),
        supabase.from("courses").select("*").eq("id", aData.course_id).single(),
        supabase.from("submissions").select("*").eq("assignment_id", asgId),
        supabase.from("users").select("*").eq("role", "student")
      ]);
      
      setA(aData);
      setLesson(lRes.data || { id: "l1", index: 1 });
      setCourse(cRes.data || { id: "c1", code: "Unknown" });
      setSubs(subRes.data || []);
      setStudents(stRes.data || []);
      setLoading(false);
    }
    load();
  }, [asgId]);

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

  const sById = (id) => students.find((s) => s.id === id) || { name: "Unknown", student_no: "-", section: "-" };
  const counts = { all: subs.length, submitted: subs.filter((s) => s.status === "submitted" || s.status === "late").length, graded: subs.filter((s) => s.status === "graded").length, "not-submitted": subs.filter((s) => s.status === "not-submitted").length };
  const list = filter === "all" ? subs : filter === "submitted" ? subs.filter((s) => s.status === "submitted" || s.status === "late") : subs.filter((s) => s.status === filter);

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

      <div className="card">
        <div className="card-h flex items-center justify-between">
          <div className="title">รายการส่งงาน {filter !== "all" && <span className="muted fw-4">({list.length})</span>}</div>
          <div className="flex gap-2">
            <div className="rel hide-m"><Icon name="search" size={15} style={{ position: "absolute", left: 10, top: 9, color: "var(--subtle)" }} /><input className="input" style={{ paddingLeft: 32, width: 190, height: 34 }} placeholder="ค้นหานักศึกษา…" /></div>
            <button className="btn btn-outline btn-sm"><Icon name="filter" size={15} />Section</button>
          </div>
        </div>
        <Table
          className="table hover"
          headers={[
            "นักศึกษา",
            "สถานะ",
            <span className="hide-m" key="file">ไฟล์งาน</span>,
            <span className="hide-m" key="sentAt">ส่งเมื่อ</span>,
            "คะแนน",
            ""
          ]}
          data={list}
          colSpan={6}
          renderRow={(sub) => {
            const s = sById(sub.student_id);
            const can = sub.status !== "not-submitted";
            return (
              <tr key={sub.id} onClick={() => can && nav("/i/grade/" + sub.id)} style={{ cursor: can ? "pointer" : "default", opacity: can ? 1 : .65 }}>
                <td><div className="flex items-center gap-2"><Avatar name={s.name} size={30} /><div><div className="fw-6">{s.name}</div><div className="t-xs muted">{s.student_no || "-"} · {s.section || "-"}</div></div></div></td>
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
    </div>
  );
}
