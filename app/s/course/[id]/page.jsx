"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";

function LessonRow({ l, nav }) {
  const locked = l.status === "locked-pretest";
  const chips = [];
  if (l.pretest) chips.push(["Pre-test", l.pretest.taken ? "success" : "warning", l.pretest.taken ? "checkC" : "clipboard"]);
  if (l.posttest && l.posttest.required) chips.push(["Post-test", l.posttest.taken ? "success" : "muted", l.posttest.taken ? "checkC" : "clipboard"]);
  if (l.assignment) chips.push(["ใบงาน", l.assignment.status === "graded" ? "success" : l.assignment.status === "submitted" ? "info" : "muted", "file"]);
  
  return (
    <div className="card pointer" style={{ display: "flex", alignItems: "stretch", overflow: "hidden" }}
      onClick={() => nav("/s/lesson/" + l.id)}>
      <div style={{ flex: "0 0 56px", background: locked ? "var(--muted)" : "var(--primary-soft)", display: "grid", placeItems: "center" }}>
        {locked
          ? <Icon name="lock" size={20} style={{ color: "var(--subtle)" }} />
          : <div className="t-lg fw-7" style={{ color: "var(--primary)" }}>{String(l.index).padStart(2, "0")}</div>}
      </div>
      <div className="card-p flex-1" style={{ padding: "15px 18px" }}>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 wrap">
              <span className="fw-6 t-base">{l.title}</span>
              {statusBadge(l.status)}
            </div>
            <div className="flex items-center gap-2 mt-1 t-xs muted wrap">
              <span className="flex items-center gap-1"><Icon name="video" size={13} />{l.duration}</span>
              <i className="dot-sep" />
              {chips.map(([txt, tone, ic], i) => (
                <span key={i} className="flex items-center gap-1" style={{ color: tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--muted-fg)" }}>
                  <Icon name={ic} size={13} />{txt}
                </span>
              ))}
            </div>
          </div>
          <div style={{ width: 120 }} className="hide-m">
            <div className="flex items-center justify-between t-xs mb-1"><span className="muted">{l.progress}%</span></div>
            <Progress value={l.progress} h={6} />
          </div>
          <Icon name="chevR" size={18} style={{ color: "var(--subtle)" }} />
        </div>
      </div>
    </div>
  );
}

export default function StudentCourse() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  const courseId = params?.id;
  const course = DATA.courses.find((c) => c.id === courseId) || DATA.courses[0];
  const lessons = DATA.lessons.filter((l) => l.courseId === course.id);

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "รายวิชาของฉัน", to: "/s/courses" }, { label: course.code }]} />
      <div className="card mb-5" style={{ overflow: "hidden" }}>
        <div style={{ height: 8, background: `linear-gradient(90deg, ${course.hero}, ${course.hero}aa)` }} />
        <div className="card-p flex items-start justify-between gap-4 wrap">
          <div style={{ minWidth: 260 }}>
            <div className="flex items-center gap-2 mb-2">
              <Badge tone="primary">{course.code}</Badge>
              <span className="t-xs muted">{course.term}</span>
            </div>
            <div className="t-2xl fw-7 serif" style={{ letterSpacing: "-.01em" }}>{course.title}</div>
            <div className="muted mt-1 pretty">{course.subtitle}</div>
            <div className="flex items-center gap-3 mt-3 t-sm muted wrap">
              <span className="flex items-center gap-1"><Icon name="user" size={15} />{course.instructor}</span>
              <i className="dot-sep" />
              <span className="flex items-center gap-1"><Icon name="book" size={15} />{lessons.length} บทเรียน</span>
            </div>
          </div>
          <div className="card bg-muted" style={{ padding: 16, minWidth: 188, border: 0 }}>
            <div className="t-xs muted mb-1">ความคืบหน้ารวม</div>
            <div className="flex items-end gap-2"><span className="t-3xl fw-7 tnum" style={{ lineHeight: 1 }}>{course.progress}</span><span className="muted mb-1">%</span></div>
            <div className="mt-2"><Progress value={course.progress} /></div>
            <div className="t-xs muted mt-2">เรียนจบ 1 จาก {lessons.length} บทเรียน</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="t-md fw-7">บทเรียนทั้งหมด</div>
        <div className="t-xs muted">เรียงตามลำดับบทเรียน</div>
      </div>
      <div className="flex col gap-3">
        {lessons.map((l) => <LessonRow key={l.id} l={l} nav={nav} />)}
      </div>
    </div>
  );
}
