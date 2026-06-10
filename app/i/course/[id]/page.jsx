"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, Avatar } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";

function StudentRoster() {
  const students = DATA.students;
  return (
    <div className="card">
      <div className="card-h flex items-center justify-between"><div className="title">รายชื่อนักศึกษา ({students.length})</div>
        <div className="flex gap-2"><div className="rel"><Icon name="search" size={15} style={{ position: "absolute", left: 10, top: 9, color: "var(--subtle)" }} /><input className="input btn-sm" style={{ paddingLeft: 32, width: 200, height: 34 }} placeholder="ค้นหา…" /></div></div>
      </div>
      <table className="table">
        <thead><tr><th>รหัสนักศึกษา</th><th>ชื่อ-นามสกุล</th><th>Section</th><th className="hide-m">ความคืบหน้า</th></tr></thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id}>
              <td className="num">{s.no}</td>
              <td><div className="flex items-center gap-2"><Avatar name={s.name} size={28} />{s.name}</div></td>
              <td><Badge tone="outline">{s.sec}</Badge></td>
              <td className="hide-m" style={{ width: 180 }}><div className="flex items-center gap-2"><Progress value={40 + Math.random() * 50} h={6} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InstructorCourse() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const courseId = params?.id;
  const course = DATA.courses.find((c) => c.id === courseId) || DATA.courses[0];
  const lessons = DATA.lessons.filter((l) => l.courseId === course.id);
  const [tab, setTab] = React.useState("lessons");

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชา", to: "/i/courses" }, { label: course.code }]} />
      <PageHead kicker={course.term} title={course.title}
        right={<div className="flex gap-2"><button className="btn btn-outline"><Icon name="settings" size={16} />ตั้งค่า</button><button className="btn btn-primary" onClick={() => nav("/i/lesson/l1")}><Icon name="plus" size={16} />เพิ่มบทเรียน</button></div>} />

      <div className="grid grid-4 gap-3 mb-5">
        {[["บทเรียน", lessons.length, "book"], ["นักศึกษา", course.students, "users"], ["รอตรวจใบงาน", 3, "file"], ["คะแนนเฉลี่ย Post-test", "8.4", "chart"]].map((s, i) => (
          <div key={i} className="card card-p flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name={s[2]} size={19} /></div>
            <div><div className="t-2xl fw-7 tnum" style={{ lineHeight: 1 }}>{s[1]}</div><div className="t-xs muted mt-1">{s[0]}</div></div>
          </div>
        ))}
      </div>

      <div className="tabs mb-4">
        {[["lessons", "บทเรียน", "book"], ["students", "นักศึกษา", "users"], ["settings", "ตั้งค่ารายวิชา", "settings"]].map(([k, t, ic]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
        ))}
      </div>

      {tab === "lessons" && (
        <div className="flex col gap-3">
          {lessons.map((l) => (
            <div key={l.id} className="card card-p flex items-center gap-3 pointer" style={{ padding: "14px 18px" }} onClick={() => nav("/i/lesson/" + l.id)}>
              <div className="iconbtn ghost" style={{ cursor: "grab" }}><Icon name="more" size={16} style={{ transform: "rotate(90deg)" }} /></div>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: "var(--muted)", display: "grid", placeItems: "center", fontWeight: 700, color: "var(--primary)", flex: "0 0 40px" }}>{String(l.index).padStart(2, "0")}</div>
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="fw-6">{l.title}</div>
                <div className="flex items-center gap-2 t-xs muted mt-1 wrap">
                  <span className="flex items-center gap-1"><Icon name="video" size={13} />{l.video ? "มีวิดีโอ" : "ไม่มีวิดีโอ"}</span><i className="dot-sep" />
                  <span className="flex items-center gap-1"><Icon name="clipboard" size={13} />Pre/Post-test</span><i className="dot-sep" />
                  <span className="flex items-center gap-1"><Icon name="file" size={13} />{l.assignment ? "1 ใบงาน" : "ไม่มีใบงาน"}</span>
                </div>
              </div>
              {l.assignment && <Badge tone="warning" dot>2 รอตรวจ</Badge>}
              <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); nav("/i/lesson/" + l.id); }}><Icon name="pencil" size={14} />จัดการ</button>
            </div>
          ))}
          <button className="card card-p flex items-center justify-center gap-2 pointer muted" style={{ borderStyle: "dashed", background: "#fbfcfd" }} onClick={() => nav("/i/lesson/l1")}>
            <Icon name="plus" size={17} />เพิ่มบทเรียนใหม่
          </button>
        </div>
      )}
      {tab === "students" && <StudentRoster />}
      {tab === "settings" && <div className="card card-p"><div className="empty"><div className="ec"><Icon name="settings" size={22} /></div><div>ตั้งค่ารายวิชา — ชื่อ, รหัส, ภาคเรียน, สิทธิ์การเข้าถึง</div></div></div>}
    </div>
  );
}
