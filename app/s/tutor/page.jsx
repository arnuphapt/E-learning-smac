"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

// Tutor sets this student may open. The list comes from /api/tutor/sets, which enforces the year / section lock.
export default function StudentTutorSets() {
  const router = useRouter();
  const [sets, setSets] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tutor/sets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setSets(d.sets || []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) {
    return (
      <div className="container p-5">
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
          <div className="fw-6 fg">โหลดชุดติวไม่สำเร็จ</div>
          <div className="t-sm muted">กรุณาลองใหม่อีกครั้ง</div>
        </div></div>
      </div>
    );
  }
  if (!sets) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead kicker="โหมดติว" title="ชุดติวของฉัน" desc="ทบทวนเนื้อหาและฝึกทำข้อสอบเป็นชุดต่อบท แยกจากรายวิชาปกติ" />
      {sets.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="book" size={24} /></div>
          <div><div className="fw-6 fg">ยังไม่มีชุดติวสำหรับคุณ</div><div className="t-sm mt-1">เมื่ออาจารย์เปิดชุดติวให้ชั้นปีหรือกลุ่มเรียนของคุณ จะแสดงที่นี่</div></div>
        </div></div>
      ) : (
        <div className="grid grid-3 gap-4">
          {sets.map((c) => (
            <div key={c.id} className="card pointer" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={() => router.push("/s/tutor/" + c.id)}>
              <div style={{ height: 76, background: `linear-gradient(120deg, ${c.hero || "#0d6e8c"}, ${(c.hero || "#0d6e8c")}cc)`, display: "flex", alignItems: "center", padding: "0 18px" }}>
                <span className="badge" style={{ background: "rgba(255,255,255,.22)", color: "#fff", fontWeight: 700 }}>{c.code}</span>
              </div>
              <div className="card-p flex-1 flex col">
                <div className="t-md fw-7 serif" style={{ letterSpacing: "-.01em" }}>{c.title}</div>
                <div className="muted t-sm mt-1 pretty" style={{ minHeight: 36 }}>{c.subtitle}</div>
                <div className="flex items-center justify-between mt-4">
                  <Badge tone="outline">{c.lessons} บท</Badge>
                  <span className="btn btn-soft btn-sm">เปิดชุดติว<Icon name="arrR" size={15} /></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
