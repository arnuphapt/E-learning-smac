"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fileHref } from "@/lib/files";
import Icon from "@/components/ui/Icon";
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
        <div className="clay-card" style={{ padding: "48px 24px" }}>
          <div className="empty">
            <div className="clay-well" style={{ width: 48, height: 48, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
              <Icon name="alert" size={22} style={{ color: "var(--warning)" }} />
            </div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบบทเรียน</div>
            <div className="t-sm muted mt-1">ไม่พบบทเรียนนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ</div>
            <button className="clay-btn clay-btn-soft clay-btn-sm mt-3" onClick={() => nav("/s/tutor")}>
              <Icon name="arrL" size={14} />กลับไปรายการชุดติว
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (!data) return <Loading className="container p-5 text-center muted" />;

  const { set, lesson } = data;
  return (
    <div className="container" style={{ paddingBottom: 40 }}>
      <Crumb nav={nav} items={[{ label: "ชุดติวของฉัน", to: "/s/tutor" }, { label: set.code, to: "/s/tutor/" + set.id }, { label: "บทที่ " + lesson.index }]} />
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="clay-badge clay-badge-primary" style={{ fontWeight: 700 }}>{set.code}</span>
          <span className="clay-badge">บทที่ {lesson.index}</span>
        </div>
        <h1 className="t-2xl fw-7 serif" style={{ letterSpacing: "-.01em", margin: "0 0 6px" }}>{lesson.title}</h1>
      </div>

      {lesson.video_url ? (
        <div className="clay-card mb-4" style={{ padding: 8, overflow: "hidden" }}>
          <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", borderRadius: 16, overflow: "hidden" }}>
            <video src={fileHref(lesson.video_url)} controls className="w-full h-full" style={{ display: "block", outline: "none" }} />
          </div>
        </div>
      ) : (
        <div className="clay-card mb-4" style={{ padding: "36px 20px" }}>
          <div className="empty">
            <div className="t-sm muted">บทนี้ไม่มีวิดีโอ</div>
          </div>
        </div>
      )}

      <div className="clay-card mb-4 flex items-center justify-between gap-4 wrap" style={{ padding: "24px 26px" }}>
        <div>
          <div className="t-base fw-7" style={{ fontSize: 17 }}>ทำข้อสอบบทนี้</div>
          <div className="t-sm muted mt-1" style={{ color: "#475569" }}>สุ่มชุดข้อใหม่ทุกรอบ ทำซ้ำได้ไม่จำกัด</div>
        </div>
        <div className="flex gap-2.5 wrap">
          <button className="clay-btn clay-btn-soft" onClick={() => nav("/s/tutor/lesson/" + lesson.id + "/result")}>
            ดูผลของฉัน
          </button>
          <button className="clay-btn clay-btn-primary" onClick={() => nav("/s/tutor/lesson/" + lesson.id + "/exam")}>
            <Icon name="play" size={15} />ทำข้อสอบ
          </button>
        </div>
      </div>

      <div className="clay-card" style={{ padding: "26px 28px" }}>
        <h2 className="t-base fw-7 mb-2" style={{ fontSize: 16, margin: "0 0 10px" }}>รายละเอียดบทเรียน</h2>
        <p className="muted lead pretty" style={{ margin: 0, whiteSpace: "pre-line", color: "#334155", lineHeight: 1.65 }}>
          {lesson.description || "ไม่มีคำอธิบายบทเรียน"}
        </p>
      </div>
    </div>
  );
}
