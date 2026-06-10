"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge, Progress, statusBadge } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";

function ChecklistItem({ icon, label, sub, tone, action, onClick, active }) {
  const colors = { done: "var(--success)", current: "var(--primary)", todo: "var(--subtle)", locked: "var(--subtle)" };
  return (
    <div className={"flex items-center gap-3 " + (onClick ? "pointer" : "")} onClick={onClick}
      style={{ padding: "11px 12px", borderRadius: 11, background: active ? "var(--primary-soft)" : "transparent", transition: ".12s" }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", flex: "0 0 30px",
        background: tone === "done" ? "var(--success-soft)" : tone === "current" ? "var(--primary-soft)" : "var(--muted)",
        color: colors[tone] }}>
        <Icon name={icon} size={16} />
      </div>
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div className="t-sm fw-6 truncate">{label}</div>
        {sub && <div className="t-xs muted truncate">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

function VideoStage({ lesson, nav, gated }) {
  const [playing, setPlaying] = React.useState(false);
  if (gated) {
    return (
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b1220", borderRadius: 14, overflow: "hidden", display: "grid", placeItems: "center" }}>
        <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0, opacity: .12, border: 0 }} />
        <div style={{ position: "relative", textAlign: "center", color: "#fff", padding: 24, maxWidth: 440 }}>
          <div style={{ width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Icon name="lock" size={26} />
          </div>
          <div className="t-lg fw-7">บทเรียนนี้ถูกล็อกไว้</div>
          <div style={{ color: "#94a3b8", marginTop: 6, fontSize: 13.5 }} className="pretty">
            กรุณาทำแบบทดสอบก่อนเรียน (Pre-test) ให้เสร็จก่อน จึงจะสามารถเข้าชมวิดีโอและเนื้อหาบทเรียนได้
          </div>
          <button className="btn btn-primary btn-lg mt-4" onClick={() => nav("/s/test/" + lesson.id + "/pre")}>
            <Icon name="clipboard" size={17} />เริ่มทำ Pre-test ({lesson.pretest.questions} ข้อ)
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", aspectRatio: "16/9", background: "#0b1220", borderRadius: 14, overflow: "hidden" }}>
      <div className="ph" style={{ position: "absolute", inset: 0, borderRadius: 0, opacity: .14, border: 0 }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <button onClick={() => setPlaying(!playing)} style={{ width: 72, height: 72, borderRadius: 99, border: 0, cursor: "pointer", background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 8px 30px rgba(13,110,140,.5)" }}>
          <Icon name={playing ? "pencil" : "play"} size={28} style={{ marginLeft: playing ? 0 : 3 }} />
        </button>
      </div>
      {/* control bar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "26px 16px 12px", background: "linear-gradient(transparent, rgba(0,0,0,.6))" }}>
        <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,.25)" }}>
          <div style={{ width: lesson.progress + "%", height: "100%", borderRadius: 99, background: "var(--primary)" }} />
        </div>
        <div className="flex items-center justify-between mt-2" style={{ color: "#fff" }}>
          <div className="flex items-center gap-3">
            <Icon name="play" size={16} /><Icon name="refresh" size={15} style={{ opacity: .8 }} />
            <span className="t-xs mono" style={{ opacity: .85 }}>29:18 / {lesson.duration.replace(" นาที", ":00")}</span>
          </div>
          <div className="flex items-center gap-3" style={{ opacity: .85 }}>
            <span className="t-xs">1.0x</span><Icon name="settings" size={15} /><Icon name="grid" size={15} />
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonOverview({ lesson }) {
  return (
    <div className="card card-p">
      <div className="t-base fw-7 mb-2">วัตถุประสงค์การเรียนรู้</div>
      <ul className="muted lead" style={{ margin: 0, paddingLeft: 18 }}>
        <li>อธิบายพยาธิสรีรวิทยาและปัจจัยเสี่ยงของภาวะหัวใจล้มเหลวได้</li>
        <li>ประเมินอาการแสดงและจำแนกความรุนแรงตามเกณฑ์ NYHA ได้</li>
        <li>วางแผนการพยาบาลผู้ป่วยภาวะหัวใจล้มเหลวแบบองค์รวมได้</li>
        <li>ระบุการพยาบาลเพื่อป้องกันภาวะแทรกซ้อนที่สำคัญได้</li>
      </ul>
      <hr className="divider mt-4 mb-4" />
      <div className="t-base fw-7 mb-2">เนื้อหาโดยสังเขป</div>
      <p className="muted lead pretty" style={{ margin: 0 }}>{lesson.desc} โดยเน้นการเชื่อมโยงความรู้พื้นฐานกับการปฏิบัติการพยาบาลจริง พร้อมกรณีตัวอย่างผู้ป่วยในหอผู้ป่วยอายุรกรรม</p>
    </div>
  );
}

function LessonDocs() {
  const files = [["เอกสารประกอบการสอน บทที่ 1.pdf", "2.4 MB", "file"], ["สไลด์ Heart Failure.pdf", "5.1 MB", "file"], ["แนวทางการประเมิน NYHA.pdf", "640 KB", "file"]];
  return (
    <div className="card">
      {files.map((f, i) => (
        <div key={i} className={"flex items-center gap-3 card-p " + (i < files.length - 1 ? "border-b" : "")} style={{ padding: "14px 18px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: "var(--danger-soft)", color: "var(--danger)", display: "grid", placeItems: "center" }}><Icon name="file" size={18} /></div>
          <div className="flex-1"><div className="t-sm fw-6">{f[0]}</div><div className="t-xs muted">PDF · {f[1]}</div></div>
          <button className="btn btn-outline btn-sm"><Icon name="download" size={15} />ดาวน์โหลด</button>
        </div>
      ))}
    </div>
  );
}

function LessonAssignTab({ asg, nav }) {
  if (!asg) return <div className="card"><div className="empty"><div className="ec"><Icon name="file" size={22} /></div><div>บทเรียนนี้ไม่มีใบงาน</div></div></div>;
  const a = DATA.assignments.find((x) => x.id === asg.id);
  return (
    <div className="card card-p flex items-center justify-between gap-3 wrap">
      <div className="flex items-center gap-3">
        <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="file" size={20} /></div>
        <div>
          <div className="fw-6">{a.title}</div>
          <div className="t-xs muted flex items-center gap-2 mt-1"><Icon name="cal" size={13} />กำหนดส่ง {a.due} <i className="dot-sep" /> {a.points} คะแนน</div>
        </div>
      </div>
      <div className="flex items-center gap-2">{statusBadge(asg.status)}<button className="btn btn-primary btn-sm" onClick={() => nav("/s/assignment/" + a.id)}>เปิดใบงาน<Icon name="arrR" size={15} /></button></div>
    </div>
  );
}

function LessonNotes() {
  return (
    <div className="card card-p">
      <textarea className="input" rows={5} placeholder="จดบันทึกระหว่างเรียน… (บันทึกอัตโนมัติ)" defaultValue="" />
      <div className="flex justify-end mt-3"><button className="btn btn-soft btn-sm"><Icon name="check" size={15} />บันทึกแล้ว</button></div>
    </div>
  );
}

function NextLessonCard({ lesson, nav }) {
  const all = DATA.lessons.filter((l) => l.courseId === lesson.courseId);
  const idx = all.findIndex((l) => l.id === lesson.id);
  const next = all[idx + 1];
  if (!next) return null;
  return (
    <div className="card pointer" onClick={() => nav("/s/lesson/" + next.id)}>
      <div className="card-p flex items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--muted)", display: "grid", placeItems: "center", flex: "0 0 44px" }}>
          <Icon name={next.status === "locked-pretest" ? "lock" : "play"} size={18} style={{ color: "var(--subtle)" }} />
        </div>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="t-xs muted">บทเรียนถัดไป</div>
          <div className="t-sm fw-6 truncate">บทที่ {next.index} · {next.title}</div>
        </div>
        <Icon name="chevR" size={18} style={{ color: "var(--subtle)" }} />
      </div>
    </div>
  );
}

export default function StudentLesson() {
  const router = useRouter();
  const params = useParams();
  const nav = (path) => router.push(path);

  // In a real app, use media queries or a hook for 'device'. Here we'll default to desktop styling behavior for simplicity.
  const mobile = false;

  const lessonId = params?.id;
  const lesson = DATA.lessons.find((l) => l.id === lessonId) || DATA.lessons[0];
  const course = DATA.courses.find((c) => c.id === lesson.courseId);
  const gated = lesson.status === "locked-pretest" && !lesson.pretest.taken;
  const [tab, setTab] = React.useState("overview");

  const pre = lesson.pretest, post = lesson.posttest, asg = lesson.assignment;

  const SideRail = (
    <div className="flex col gap-4">
      <div className="card">
        <div className="card-h"><div className="title t-base">ความคืบหน้าบทเรียน</div></div>
        <div style={{ padding: 8 }}>
          <ChecklistItem icon={pre.taken ? "checkC" : "clipboard"} tone={pre.taken ? "done" : "current"}
            label="Pre-test" sub={pre.taken ? `ทำแล้ว · ${pre.score}/${pre.total} คะแนน` : "ต้องทำก่อนเข้าเรียน"}
            onClick={() => nav("/s/test/" + lesson.id + "/pre")}
            action={<Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />
          <ChecklistItem icon="playC" tone={gated ? "locked" : "current"}
            label="วิดีโอบทเรียน" sub={gated ? "ปลดล็อกหลังทำ Pre-test" : `ดูแล้ว ${lesson.progress}%`} />
          {asg && <ChecklistItem icon="file" tone={asg.status === "graded" ? "done" : asg.status === "submitted" ? "current" : "todo"}
            label="ใบงาน" sub={asg.status === "graded" ? `ตรวจแล้ว · ${asg.score}/${asg.total}` : asg.status === "submitted" ? "ส่งแล้ว · รอตรวจ" : "ยังไม่ส่ง"}
            onClick={() => nav("/s/assignment/" + asg.id)}
            action={<Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />}
          {post.required && <ChecklistItem icon={post.taken ? "checkC" : "clipboard"} tone={post.taken ? "done" : gated ? "locked" : "todo"}
            label="Post-test" sub={post.taken ? `ทำแล้ว · ${post.score}/${post.total}` : gated ? "ปลดล็อกหลังเรียนจบ" : "พร้อมให้ทำแล้ว"}
            onClick={() => !gated && nav("/s/test/" + lesson.id + "/post")}
            action={!gated && !post.taken ? <span className="btn btn-soft btn-sm">ทำเลย</span> : <Icon name="chevR" size={16} style={{ color: "var(--subtle)" }} />} />}
        </div>
      </div>
      <NextLessonCard lesson={lesson} nav={nav} />
    </div>
  );

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "รายวิชาของฉัน", to: "/s/courses" }, { label: course.code, to: "/s/course/" + course.id }, { label: "บทที่ " + lesson.index }]} />
      <div className="flex gap-5 items-start" style={{ flexDirection: mobile ? "column" : "row" }}>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <VideoStage lesson={lesson} nav={nav} gated={gated} />
          <div className="flex items-start justify-between gap-3 mt-4 wrap">
            <div>
              <div className="t-xs fw-6 c-primary uppercase mb-1">บทที่ {lesson.index} · {course.code}</div>
              <div className="t-xl fw-7 serif pretty" style={{ letterSpacing: "-.01em" }}>{lesson.title}</div>
              <div className="flex items-center gap-2 mt-2 t-sm muted wrap">
                <span className="flex items-center gap-1"><Icon name="video" size={14} />{lesson.duration}</span>
                <i className="dot-sep" />{statusBadge(lesson.status)}
              </div>
            </div>
            {!gated && <button className="btn btn-outline btn-sm"><Icon name="check" size={15} />ทำเครื่องหมายว่าเรียนจบ</button>}
          </div>

          <div className="tabs mt-5">
            {[["overview", "ภาพรวม", "book"], ["docs", "เอกสารประกอบ", "folder"], ["assign", "ใบงาน", "file"], ["notes", "บันทึก", "pencil"]].map(([k, t, ic]) => (
              <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={ic} size={15} />{t}</button>
            ))}
          </div>
          <div className="mt-4">
            {tab === "overview" && <LessonOverview lesson={lesson} />}
            {tab === "docs" && <LessonDocs />}
            {tab === "assign" && <LessonAssignTab asg={asg} nav={nav} />}
            {tab === "notes" && <LessonNotes />}
          </div>
          {mobile && <div className="mt-5">{SideRail}</div>}
        </div>
        {!mobile && <div style={{ width: 330, flex: "0 0 330px", position: "sticky", top: 18 }}>{SideRail}</div>}
      </div>
    </div>
  );
}
