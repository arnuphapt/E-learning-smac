"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";

export default function InstructorCourses() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const courses = DATA.courses;

  return (
    <div className="container">
      <PageHead kicker="พื้นที่อาจารย์ผู้สอน" title="จัดการรายวิชา"
        desc="กลุ่มวิชาการพยาบาลผู้ใหญ่และผู้สูงอายุ"
        right={<button className="btn btn-primary" onClick={() => nav("/i/course/new")}><Icon name="plus" size={16} />สร้างรายวิชา</button>} />
      <div className="card">
        <table className="table hover">
          <thead><tr><th>รายวิชา</th><th className="hide-m">ภาคเรียน</th><th>บทเรียน</th><th>นักศึกษา</th><th className="hide-m">รอตรวจ</th><th></th></tr></thead>
          <tbody>
            {courses.map((c, i) => (
              <tr key={c.id} onClick={() => nav("/i/course/" + c.id)}>
                <td>
                  <div className="flex items-center gap-3">
                    <div style={{ width: 38, height: 38, borderRadius: 9, background: c.hero, color: "#fff", display: "grid", placeItems: "center", flex: "0 0 38px", fontWeight: 700, fontSize: 12 }}>{c.code.slice(-3)}</div>
                    <div><div className="fw-6">{c.title}</div><div className="t-xs muted">{c.code} · {c.subtitle.slice(0, 28)}…</div></div>
                  </div>
                </td>
                <td className="hide-m muted">{c.term}</td>
                <td className="num">{c.lessons}</td>
                <td className="num">{c.students}</td>
                <td className="hide-m">{i === 0 ? <Badge tone="warning" dot>3 ชิ้น</Badge> : <span className="muted t-sm">—</span>}</td>
                <td><Icon name="chevR" size={17} style={{ color: "var(--subtle)" }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
