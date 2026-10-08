"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { hasRole } from "@/lib/roles";
import { bankWarning, lockSummary } from "@/lib/tutor-bank";
import Icon from "@/components/ui/Icon";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";

const TUTOR_HERO = "#4338a8";

// Teacher list of tutor sets. /i/courses reads the `courses` view, which hides them, so this page reads courses_all.
// Same visibility rule as /i/courses: admin = all, course_manager = own subject group, instructor = assigned courses.
// Each row says whether students can actually use the set: lock (empty = nobody) and lessons whose bank is short.
export default function InstructorTutorSets() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const { data: session } = useSession();
  const user = session?.user;
  const canCreate = hasRole(user?.role, "admin", "course_manager");
  const [sets, setSets] = useState(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [cRes, lRes, qRes, ciRes] = await Promise.all([
        supabase.from("courses_all").select("*").eq("kind", "tutor").order("code"),
        supabase.from("lessons").select("id, course_id, status, tutor_draw_count"),
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
      setSets(visible.map((c) => {
        const lessons = (lRes.data || []).filter((l) => l.course_id === c.id);
        return {
          ...c,
          lessonCount: lessons.length,
          published: lessons.filter((l) => l.status === "active").length,
          questions: lessons.reduce((n, l) => n + (bank[l.id] || 0), 0),
          short: lessons.filter((l) => bankWarning(bank[l.id] || 0, l.tutor_draw_count)).length,
        };
      }));
    })();
    return () => { cancelled = true; };
  }, [user]);

  const create = async (e) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return toast("กรุณากรอกชื่อชุดและรหัสชุด", "warning");
    setSaving(true);
    try {
      const [tRes, gRes] = await Promise.all([
        supabase.from("terms").select("*"),
        supabase.from("subject_groups").select("*").eq("status", "active"),
      ]);
      const t = (tRes.data || [])[0];
      const groupId = user.group_id || user.group_ids?.[0] || (hasRole(user.role, "admin") ? gRes.data?.[0]?.id : null) || null;
      const row = {
        id: "c_" + Date.now(),
        code: code.trim(),
        title: title.trim(),
        subtitle: "",
        term: t ? `${t.name} ${t.year}` : "",
        year: String(t ? t.year : new Date().getFullYear() + 543),
        instructor: user.name,
        group_id: groupId,
        group_name: (gRes.data || []).find((g) => g.id === groupId)?.name || null,
        section: null,
        lessons: 0,
        students: 0,
        progress: 0,
        hero: TUTOR_HERO,
        year_level: [],
        access: { allowedYears: [], allowedEmails: [] },
        kind: "tutor",
      };
      // courses_all, not the `courses` view: the view's WITH CHECK OPTION rejects kind = 'tutor' rows.
      const { error } = await supabase.from("courses_all").insert([row]);
      if (error) throw error;
      const { error: linkErr } = await supabase.from("course_instructors").insert([{ course_id: row.id, user_id: user.id }]);
      if (linkErr) console.error("Error linking course instructor:", linkErr);
      nav("/i/tutor/" + row.id);
    } catch (err) {
      toast("สร้างชุดติวไม่สำเร็จ: " + err.message, "error");
      setSaving(false);
    }
  };

  if (!sets) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <div className="tw-head">
        <div>
          <span className="tw-tag">โหมดติว</span>
          <h1>ชุดติว</h1>
          <div className="tw-stats">
            <span><b>{sets.length}</b>ชุด</span>
            <span><b>{sets.reduce((n, s) => n + s.questions, 0)}</b>ข้อในคลัง</span>
            <span><b>{sets.filter((s) => !lockSummary(s).open).length}</b>ชุดที่ยังไม่มีนักศึกษาเข้าได้</span>
          </div>
        </div>
        {canCreate && !creating && (
          <button className="btn btn-lg" style={{ background: "#fff", color: "#231c63" }} onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} />สร้างชุดติว
          </button>
        )}
      </div>

      {creating && (
        <form className="card card-p mb-5" onSubmit={create}>
          <div className="t-base fw-7 mb-1">ชุดติวใหม่</div>
          <div className="t-sm muted mb-4">ตั้งชื่อก่อน แล้วค่อยเพิ่มบทเรียน คลังข้อสอบ และกำหนดว่านักศึกษากลุ่มไหนเข้าได้ในหน้าถัดไป</div>
          <div className="grid grid-2 gap-3">
            <div className="field"><label className="label">ชื่อชุดติว <span className="c-danger">*</span></label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ติวสอบรวบยอด การพยาบาลผู้ใหญ่ 1" autoFocus /></div>
            <div className="field"><label className="label">รหัสชุด <span className="c-danger">*</span></label>
              <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น NUR301-TUTOR" /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={saving}><Icon name={saving ? "loader" : "check"} size={15} className={saving ? "spin" : ""} />สร้างและเปิดชุดนี้</button>
          </div>
        </form>
      )}

      {sets.length === 0 ? (
        <div className="card"><div className="empty">
          <div className="ec"><Icon name="award" size={24} /></div>
          <div className="fw-6 fg">ยังไม่มีชุดติว</div>
          <div className="t-sm muted">{canCreate ? "กด “สร้างชุดติว” เพื่อเริ่ม ชุดติวไม่ปะปนกับรายวิชาปกติ" : "ผู้ดูแลหรืออาจารย์ผู้รับผิดชอบจะเป็นผู้สร้างชุดติว แล้วมอบหมายให้คุณ"}</div>
        </div></div>
      ) : (
        <div className="tw-rail">
          <div className="tw-sets-row head"><span>ชุดติว</span><span>บทเรียน</span><span>คลังข้อสอบ</span><span>ใครเข้าได้</span><span /></div>
          {sets.map((c) => {
            const lock = lockSummary(c);
            return (
              <div key={c.id} className="tw-sets-row">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-6 truncate">{c.title}</div>
                  <div className="t-xs muted mono">{c.code}</div>
                </div>
                <div className="t-sm tnum">{c.lessonCount} บท{c.lessonCount > 0 && <span className="muted"> · เผยแพร่ {c.published}</span>}</div>
                <div className="t-sm tnum">
                  {c.questions} ข้อ
                  {c.short > 0 && <div className="t-xs fw-6 c-warning">{c.short} บทคลังไม่พอ</div>}
                </div>
                <div className={"t-sm" + (lock.open ? "" : " c-warning fw-6")}>{lock.text}</div>
                <button className="btn btn-outline btn-sm" onClick={() => nav("/i/tutor/" + c.id)}>เปิดชุดนี้<Icon name="arrR" size={14} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
