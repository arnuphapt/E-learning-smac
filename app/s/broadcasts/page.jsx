"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHead } from "@/components/ui/Shared";
import { Badge } from "@/components/ui/Primitives";

export default function StudentBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from("broadcasts")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBroadcasts(data || []);
        setLoading(false);
      });
  }, []);

  const formatDate = (iso) =>
    iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="container">
      <PageHead kicker="พื้นที่นักศึกษา" title="ประกาศจากระบบ" desc="ข่าวสารและประกาศจากอาจารย์ผู้ดูแลระบบ" />

      {loading ? (
        <div className="flex items-center justify-center" style={{ minHeight: 200 }}>
          <span className="muted t-sm">กำลังโหลด...</span>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="card card-p flex col items-center" style={{ gap: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>😸</div>
          <div className="fw-6">ยังไม่มีประกาศ</div>
          <div className="t-sm muted">เมื่อมีประกาศจากระบบ จะแสดงที่นี่</div>
        </div>
      ) : (
        <div className="flex col gap-3">
          {broadcasts.map(b => (
            <div key={b.id} className="card card-p" style={{
              borderLeft: `4px solid ${b.pinned ? "var(--primary)" : "var(--border)"}`,
            }}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {b.pinned && <span>📌</span>}
                  <span className="fw-7">{b.title}</span>
                  {b.pinned && <Badge tone="primary">ปักหมุด</Badge>}
                </div>
                <span className="t-xs muted" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(b.created_at)}</span>
              </div>
              <div className="t-sm pretty" style={{ lineHeight: 1.75, whiteSpace: "pre-wrap", color: "var(--fg)" }}>{b.body}</div>
              {b.expires_at && (
                <div className="t-xs muted mt-3">หมดอายุ: {formatDate(b.expires_at)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
