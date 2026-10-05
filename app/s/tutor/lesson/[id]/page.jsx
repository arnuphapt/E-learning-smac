"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fileHref } from "@/lib/files";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

// A tutor lesson: video (R2 via /api/files, same <video> player as course lessons) and description.
// Data from /api/tutor/lessons/<id>; the exam is on ./exam.
export default function StudentTutorLesson() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const id = useParams()?.id;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch("/api/tutor/lessons/" + encodeURIComponent(id), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [id]);

  if (missing) {
    return (
      <div className="container p-5">
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
          <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบบทเรียน</div>
          <div className="t-sm muted">ไม่พบบทเรียนนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ</div>
          <button className="btn btn-outline btn-sm" onClick={() => nav("/s/tutor")}>กลับไปรายการชุดติว</button>
        </div></div>
      </div>
    );
  }
  if (!data) return <Loading className="container p-5 text-center muted" />;

  const { set, lesson } = data;
  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "ชุดติวของฉัน", to: "/s/tutor" }, { label: set.code, to: "/s/tutor/" + set.id }, { label: "บทที่ " + lesson.index }]} />
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2"><Badge tone="primary">{set.code}</Badge><Badge tone="outline">ชุดติว</Badge></div>
        <div className="t-2xl fw-7 serif" style={{ letterSpacing: "-.01em" }}>{lesson.title}</div>
      </div>
      {lesson.video_url ? (
        <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
          <video src={fileHref(lesson.video_url)} controls className="w-full h-full" style={{ display: "block", outline: "none" }} />
        </div>
      ) : (
        <div className="card mb-4"><div className="empty"><div className="t-sm muted">บทนี้ไม่มีวิดีโอ</div></div></div>
      )}
      <div className="card card-p mb-4 flex items-center justify-between gap-3 wrap">
        <div>
          <div className="t-base fw-7">ทำข้อสอบบทนี้</div>
          <div className="t-sm muted">สุ่มชุดข้อใหม่ทุกรอบ ทำซ้ำได้ไม่จำกัด</div>
        </div>
        <div className="flex gap-2 wrap">
          <button className="btn btn-outline" onClick={() => nav("/s/tutor/lesson/" + lesson.id + "/result")}>ดูผลของฉัน</button>
          <button className="btn btn-primary" onClick={() => nav("/s/tutor/lesson/" + lesson.id + "/exam")}><Icon name="play" size={16} />ทำข้อสอบ</button>
        </div>
      </div>
      <div className="card card-p">
        <div className="t-base fw-7 mb-2">รายละเอียดบทเรียน</div>
        <p className="muted lead pretty" style={{ margin: 0, whiteSpace: "pre-line" }}>{lesson.description || "ไม่มีคำอธิบายบทเรียน"}</p>
      </div>
    </div>
  );
}
