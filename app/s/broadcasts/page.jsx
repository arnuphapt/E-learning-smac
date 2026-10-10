"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "next-auth/react";
import { PageHead } from "@/components/ui/Shared";
import { Badge } from "@/components/ui/Primitives";
import Icon from "@/components/ui/Icon";

export default function StudentBroadcastsPage() {
  const { data: session, status: authStatus } = useSession();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const studentId = session?.dbId;
  const studentYear = session?.user?.study_year ? Number(session.user.study_year) : null;

  useEffect(() => {
    // authenticated implies session; cancelled drops a superseded run (session object changes on every refetch).
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    setLoading(true);

    const now = new Date().toISOString();

    const loadBroadcasts = async () => {
      const [bRes, sgRes, uRes] = await Promise.all([
        supabase
          .from("broadcasts")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("student_grades").select("prefix, year_label"),
        studentId ? supabase.from("users").select("*").eq("id", studentId).maybeSingle() : Promise.resolve({ data: null })
      ]);

      if (cancelled) return;
      const rawBroadcasts = bRes.data || [];
      const gradesList = sgRes.data || [];
      const studentProfile = uRes?.data;

      const email = session?.user?.email || "";
      const match = email.match(/^(\d+)@/);
      const parsedStudentNo = match ? match[1] : "";
      const finalStudentNo = studentProfile?.student_no || parsedStudentNo;
      const prefix = finalStudentNo ? String(finalStudentNo).substring(0, 2) : "";
      const mapping = gradesList.find(g => g.prefix === prefix);
      const studentLabel = mapping ? mapping.year_label : null;
      const studentFallback = studentYear;

      const filtered = rawBroadcasts.filter(b => {
        const allowed = b.year_level;
        if (!allowed || allowed.length === 0) return true; // no restriction

        return allowed.some(ay => {
          if (typeof ay === 'number' || !isNaN(Number(ay))) {
            return Number(ay) === studentFallback || ay == studentFallback;
          }
          return ay === studentLabel;
        });
      });

      setBroadcasts(filtered);
      setLoading(false);
    };

    loadBroadcasts();
    return () => { cancelled = true; };
  }, [session, studentId, studentYear, authStatus]);

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
          <div className="clay-pod clay-pod-muted" style={{ width: 60, height: 60, borderRadius: 18, marginBottom: 4 }}>
            <Icon name="bell" size={26} />
          </div>
          <div className="fw-6 t-md fg">ยังไม่มีประกาศ</div>
          <div className="t-sm muted">เมื่อมีประกาศจากระบบ จะแสดงที่นี่</div>
        </div>
      ) : (
        <div className="flex col gap-3">
          {broadcasts.map(b => (
            <div
              key={b.id}
              className="card card-p"
              style={{
                padding: "20px 24px",
                ...(b.pinned ? { border: "1.5px solid rgba(13, 110, 140, 0.25)" } : {})
              }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`clay-pod ${b.pinned ? "clay-pod-primary" : "clay-pod-muted"}`}
                  style={{ width: 44, height: 44, borderRadius: 13, flex: "0 0 44px" }}
                >
                  <Icon name={b.pinned ? "pin" : "bell"} size={20} />
                </div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center justify-between gap-3 mb-1.5 wrap">
                    <div className="flex items-center gap-2">
                      <span className="fw-7 t-md fg">{b.title}</span>
                      {b.pinned && <span className="clay-pill clay-pill-primary">ปักหมุด</span>}
                    </div>
                    <span className="t-xs muted" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{formatDate(b.created_at)}</span>
                  </div>
                  <div className="t-sm pretty" style={{ lineHeight: 1.75, whiteSpace: "pre-wrap", color: "var(--fg)" }}>{b.body}</div>
                  {b.expires_at && (
                    <div className="t-xs muted mt-3 flex items-center gap-1.5">
                      <Icon name="clock" size={13} />
                      <span>หมดอายุ: {formatDate(b.expires_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
