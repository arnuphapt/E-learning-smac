"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Avatar, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";

export default function SubmissionList() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const asgId = params?.id;
  const a = DATA.assignments.find((x) => x.id === asgId) || DATA.assignments[0];
  const lesson = DATA.lessons.find((l) => l.id === a.lessonId);
  const course = DATA.courses.find((c) => c.id === a.courseId);
  const subs = DATA.submissions;
  const sById = (id) => DATA.students.find((s) => s.id === id);
  const [filter, setFilter] = React.useState("all");
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
        <table className="table hover">
          <thead><tr><th>นักศึกษา</th><th>สถานะ</th><th className="hide-m">ไฟล์งาน</th><th className="hide-m">ส่งเมื่อ</th><th>คะแนน</th><th></th></tr></thead>
          <tbody>
            {list.map((sub) => {
              const s = sById(sub.studentId);
              const can = sub.status !== "not-submitted";
              return (
                <tr key={sub.id} onClick={() => can && nav("/i/grade/" + sub.id)} style={{ cursor: can ? "pointer" : "default", opacity: can ? 1 : .65 }}>
                  <td><div className="flex items-center gap-2"><Avatar name={s.name} size={30} /><div><div className="fw-6">{s.name}</div><div className="t-xs muted">{s.no} · {s.sec}</div></div></div></td>
                  <td>{statusBadge(sub.status)}</td>
                  <td className="hide-m">{sub.file ? <span className="flex items-center gap-2 t-sm c-primary"><Icon name="file" size={15} />{sub.file}</span> : <span className="muted t-sm">—</span>}</td>
                  <td className="hide-m muted t-sm">{sub.at || "—"}</td>
                  <td>{sub.score != null ? <span className="num fw-7">{sub.score}/{sub.total}</span> : can ? <span className="muted t-sm">รอตรวจ</span> : <span className="muted t-sm">—</span>}</td>
                  <td>{can && <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); nav("/i/grade/" + sub.id); }}>{sub.status === "graded" ? "แก้คะแนน" : "ตรวจงาน"}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
