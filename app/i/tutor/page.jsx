"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { hasRole } from "@/lib/roles";
import { bankWarning } from "@/lib/tutor-bank";
import Icon from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";

// Teacher list of tutor sets. /i/courses reads the `courses` view, which hides them, so this page reads courses_all.
// Same visibility rule as /i/courses: admin = all, course_manager = own subject group, instructor = assigned courses.
export default function InstructorTutorSets() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const { data: session } = useSession();
  const user = session?.user;
  const [sets, setSets] = useState(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [cRes, lRes, qRes, ciRes] = await Promise.all([
        supabase.from("courses_all").select("*").eq("kind", "tutor").order("code"),
        supabase.from("lessons").select("id, course_id, title, index, status, tutor_draw_count").order("index", { ascending: true }),
        supabase.from("questions").select("lesson_id").eq("kind", "tutor"),
        supabase.from("course_instructors").select("course_id").eq("user_id", user.id),
      ]);
      if (cancelled) return;

      const mine = (ciRes.data || []).map((ci) => ci.course_id);
      const visible = (cRes.data || []).filter((c) => {
        if (hasRole(user.role, "admin")) return true;
        if (hasRole(user.role, "course_manager")) return c.group_id === user.group_id || user.group_ids?.includes(c.group_id);
        if (hasRole(user.role, "instructor")) return mine.includes(c.id);
        return false;
      });

      const bank = {};
      for (const q of qRes.data || []) bank[q.lesson_id] = (bank[q.lesson_id] || 0) + 1;
      setSets(visible.map((c) => ({
        ...c,
        lessons: (lRes.data || []).filter((l) => l.course_id === c.id).map((l) => ({ ...l, bank: bank[l.id] || 0 })),
      })));
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!sets) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead kicker="พื้นที่อาจารย์ผู้สอน" title="ชุดติว" desc="ชุดติวไม่แสดงในรายวิชาปกติ จัดการบทเรียน คลังข้อสอบ และการล็อคชั้นปี/กลุ่มเรียนได้จากที่นี่"
        right={hasRole(user?.role, "admin", "course_manager") && (
          <button className="btn btn-primary btn-sm" onClick={() => nav("/i/course/new")}><Icon name="plus" size={15} />สร้างชุดติว</button>
        )} />
      {sets.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="book" size={24} /></div>
          <div className="fw-6 fg">ยังไม่มีชุดติว</div>
          <div className="t-sm muted">สร้างจากหน้า &quot;สร้างรายวิชา&quot; แล้วเลือกตัวเลือก &quot;ชุดติว&quot;</div>
        </div></div>
      ) : (
        <div className="flex col gap-4">
          {sets.map((c) => (
            <div key={c.id} className="card">
              <div className="card-h flex items-center justify-between gap-3 wrap">
                <div>
                  <div className="title">{c.title}</div>
                  <div className="desc">{c.code} · {c.lessons.length} บท</div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => nav("/i/course/" + c.id)}><Icon name="pencil" size={13} />จัดการชุดติว</button>
              </div>
              <div className="card-p flex col gap-2">
                {c.lessons.length === 0 && <div className="t-xs muted">ยังไม่มีบท เพิ่มบทได้จากหน้า &quot;จัดการชุดติว&quot;</div>}
                {c.lessons.map((l) => {
                  const warn = bankWarning(l.bank, l.tutor_draw_count);
                  return (
                    <div key={l.id} className="flex items-center justify-between gap-3 wrap" style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-3" style={{ minWidth: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 12 }}>{String(l.index ?? "").padStart(2, "0")}</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="t-sm fw-6 truncate">{l.title || "(ไม่มีชื่อบทเรียน)"}</div>
                          <div className="flex items-center gap-2 t-xs muted mt-1">
                            <Badge tone={l.status === "active" ? "success" : "muted"}>{l.status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</Badge>
                            <span>คลัง {l.bank} ข้อ</span>
                            {warn && <Badge tone="warning">คลังไม่พอ</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => nav("/i/lesson/" + l.id + "/bank")}><Icon name="clipboard" size={13} />คลังข้อสอบ</button>
                        <button className="btn btn-outline btn-sm" onClick={() => nav("/i/lesson/" + l.id)}><Icon name="pencil" size={13} />จัดการบท</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
