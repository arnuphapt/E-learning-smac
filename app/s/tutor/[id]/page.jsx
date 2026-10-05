"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

// One tutor set: its lessons. Data from /api/tutor/sets/<id> (lock enforced there; never contains questions).
export default function StudentTutorSet() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const id = useParams()?.id;
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch("/api/tutor/sets/" + encodeURIComponent(id), { cache: "no-store" })
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
          <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบชุดติว</div>
          <div className="t-sm muted">ไม่พบชุดติวนี้ หรือชุดติวนี้ไม่เปิดให้ชั้นปี/กลุ่มเรียนของคุณ</div>
          <button className="btn btn-outline btn-sm" onClick={() => nav("/s/tutor")}>กลับไปรายการชุดติว</button>
        </div></div>
      </div>
    );
  }
  if (!data) return <Loading className="container p-5 text-center muted" />;

  const { set, lessons } = data;
  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "ชุดติวของฉัน", to: "/s/tutor" }, { label: set.code }]} />
      <div className="card mb-5" style={{ overflow: "hidden" }}>
        <div style={{ height: 8, background: `linear-gradient(90deg, ${set.hero || "#0d6e8c"}, ${(set.hero || "#0d6e8c")}aa)` }} />
        <div className="card-p">
          <div className="flex items-center gap-2 mb-2"><Badge tone="primary">{set.code}</Badge><Badge tone="outline">ชุดติว</Badge></div>
          <div className="t-2xl fw-7 serif" style={{ letterSpacing: "-.01em" }}>{set.title}</div>
          <div className="muted mt-1 pretty">{set.subtitle}</div>
          <div className="flex items-center gap-3 mt-3 t-sm muted wrap">
            <span className="flex items-center gap-1"><Icon name="user" size={15} />{set.instructor}</span>
            <i className="dot-sep" />
            <span className="flex items-center gap-1"><Icon name="book" size={15} />{lessons.length} บท</span>
          </div>
        </div>
      </div>
      <div className="t-md fw-7 mb-3">บทเรียนทั้งหมด</div>
      {lessons.length === 0 ? (
        <div className="card"><div className="empty"><div className="t-sm muted">ชุดติวนี้ยังไม่มีบทที่เปิดให้ใช้งาน</div></div></div>
      ) : (
        <div className="flex col gap-3">
          {lessons.map((l) => (
            <div key={l.id} className="card pointer" style={{ display: "flex", alignItems: "stretch", overflow: "hidden" }} onClick={() => nav("/s/tutor/lesson/" + l.id)}>
              <div style={{ flex: "0 0 56px", background: "var(--primary-soft)", display: "grid", placeItems: "center" }}>
                <div className="t-lg fw-7" style={{ color: "var(--primary)" }}>{String(l.index ?? "").padStart(2, "0")}</div>
              </div>
              <div className="card-p flex-1 flex items-center gap-2 justify-between" style={{ padding: "15px 18px" }}>
                <div>
                  <div className="fw-6 t-base">{l.title}</div>
                  <div className="t-xs muted mt-1 flex items-center gap-1">
                    <Icon name={l.hasVideo ? "video" : "book"} size={12} />
                    {l.hasVideo ? `มีวิดีโอ (${l.duration || "ไม่ระบุ"})` : "ไม่มีวิดีโอ"}
                  </div>
                </div>
                <Icon name="chevR" size={18} style={{ color: "var(--subtle)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
