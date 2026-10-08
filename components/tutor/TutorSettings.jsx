"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { canStudentAccessTutorSet } from "@/lib/course-access";
import { lockSummary } from "@/lib/tutor-bank";
import Icon from "@/components/ui/Icon";
import { Select } from "@/components/ui/Primitives";
import { toast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import PickerDialog from "./PickerDialog";

const COLORS = ["#4338a8", "#0d6e8c", "#1e5fa8", "#2f7d5b", "#b4530b", "#0b1220"];
const yearNo = (label) => parseInt(String(label).replace(/\D/g, ""), 10);
const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// Set details and the lock (who can enter). Tutor sets fail closed: with no year / section / email the set is open to
// nobody, and the live count below is computed with the same rule the API enforces (canStudentAccessTutorSet).
// canManage (admin / course_manager) also edits the responsible instructors and may delete the set.
export default function TutorSettings({ course, canManage, onSaved }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [lookup, setLookup] = useState(null); // { students, staff, sections, yearLabels, grades, assigned }
  const [title, setTitle] = useState(course.title || "");
  const [subtitle, setSubtitle] = useState(course.subtitle || "");
  const [hero, setHero] = useState(course.hero || COLORS[0]);
  const [years, setYears] = useState((course.year_level || []).map(Number).filter(Boolean));
  const [section, setSection] = useState(course.section || "");
  const [emails, setEmails] = useState(course.access?.allowedEmails || []);
  const [mains, setMains] = useState([]);
  const [picker, setPicker] = useState(null); // "emails" | "mains" | "co"
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stRes, staffRes, secRes, gRes, ciRes] = await Promise.all([
        supabase.from("users").select("id, name, email, student_no, section, study_year").eq("role", "student"),
        supabase.from("users").select("id, name, email").or("role.like.%instructor%,role.like.%course_manager%,role.like.%admin%"),
        supabase.from("sections").select("*").eq("status", "active"),
        supabase.from("student_grades").select("prefix, year_label"),
        supabase.from("course_instructors").select("user_id").eq("course_id", course.id),
      ]);
      if (cancelled) return;
      const staff = staffRes.data || [];
      const names = (course.instructor || "").split(",").map((n) => n.trim()).filter(Boolean);
      const mainIds = staff.filter((u) => names.includes(u.name)).map((u) => u.id);
      setMains(mainIds);
      setLookup({
        mainIds,
        students: stRes.data || [],
        staff,
        sections: secRes.data || [],
        grades: gRes.data || [],
        yearLabels: Array.from(new Set((gRes.data || []).map((g) => g.year_label).filter(Boolean))).sort(),
        assigned: (ciRes.data || []).map((r) => r.user_id),
      });
    })();
    return () => { cancelled = true; };
  }, [course.id, course.instructor]);

  const draft = { kind: "tutor", section: section || null, year_level: years, access: { ...(course.access || {}), allowedEmails: emails } };
  const lock = lockSummary(draft);
  const reach = useMemo(() => {
    if (!lookup) return null;
    return lookup.students.filter((s) =>
      canStudentAccessTutorSet(draft, { email: s.email, studentNo: s.student_no, section: s.section, studyYear: s.study_year }, lookup.sections, lookup.grades)
    ).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, section, years, emails]);

  const dirty = title !== (course.title || "") || subtitle !== (course.subtitle || "") || hero !== (course.hero || COLORS[0]) ||
    section !== (course.section || "") || !sameList(years, (course.year_level || []).map(Number)) ||
    !sameList(emails, course.access?.allowedEmails || []) || (canManage && lookup && !sameList(mains, lookup.mainIds));

  const save = async () => {
    if (!title.trim()) return toast("กรุณากรอกชื่อชุดติว", "warning");
    setSaving(true);
    try {
      const fields = { title: title.trim(), subtitle, hero, year_level: years, section: section || null, access: draft.access };
      if (canManage && mains.length > 0) fields.instructor = mains.map((id) => lookup.staff.find((u) => u.id === id)?.name).filter(Boolean).join(", ");
      const { error } = await supabase.from("courses_all").update(fields).eq("id", course.id);
      if (error) throw error;
      if (canManage) {
        const missing = mains.filter((id) => !lookup.assigned.includes(id));
        if (missing.length) {
          await supabase.from("course_instructors").insert(missing.map((user_id) => ({ course_id: course.id, user_id })));
          setLookup((l) => ({ ...l, assigned: [...l.assigned, ...missing] }));
        }
        setLookup((l) => ({ ...l, mainIds: mains }));
      }
      onSaved(fields);
      toast("บันทึกชุดติวแล้ว");
    } catch (err) {
      toast("บันทึกไม่สำเร็จ: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCo = async (ids) => {
    const current = lookup.assigned.filter((id) => !mains.includes(id));
    const add = ids.filter((id) => !current.includes(id));
    const del = current.filter((id) => !ids.includes(id));
    if (add.length) {
      const { error } = await supabase.from("course_instructors").insert(add.map((user_id) => ({ course_id: course.id, user_id })));
      if (error) return toast("เพิ่มผู้สอนร่วมไม่สำเร็จ: " + error.message, "error");
    }
    if (del.length) {
      const { error } = await supabase.from("course_instructors").delete().eq("course_id", course.id).in("user_id", del);
      if (error) return toast("ถอดผู้สอนร่วมไม่สำเร็จ: " + error.message, "error");
    }
    setLookup((l) => ({ ...l, assigned: [...l.assigned.filter((id) => !del.includes(id)), ...add] }));
    setPicker(null);
    toast("อัปเดตผู้สอนร่วมแล้ว");
  };

  const remove = async () => {
    const ok = await confirm({
      title: "ลบชุดติว",
      message: `ลบชุดติว “${course.title}” (${course.code}) ใช่หรือไม่?\n\nบทเรียน คลังข้อสอบ และผลการทำข้อสอบของนักศึกษาในชุดนี้จะถูกลบถาวร กู้คืนไม่ได้`,
      danger: true, confirmText: "ลบชุดติว", cancelText: "ยกเลิก",
    });
    if (!ok) return;
    try {
      const { data: ls } = await supabase.from("lessons").select("id").eq("course_id", course.id);
      const ids = (ls || []).map((l) => l.id);
      if (ids.length) {
        const { error: qErr } = await supabase.from("questions").delete().in("lesson_id", ids);
        if (qErr) throw qErr;
        const { error: lErr } = await supabase.from("lessons").delete().in("id", ids);
        if (lErr) throw lErr;
      }
      const { error } = await supabase.from("courses_all").delete().eq("id", course.id);
      if (error) throw error;
      toast("ลบชุดติวแล้ว");
      router.push("/i/tutor");
    } catch (err) {
      toast("ลบไม่สำเร็จ: " + err.message, "error");
    }
  };

  const sectionGroups = Object.entries((lookup?.sections || []).reduce((acc, s) => {
    const y = s.year_level || "ไม่ระบุชั้นปี";
    (acc[y] ||= []).push(s);
    return acc;
  }, {})).sort(([a], [b]) => a.localeCompare(b, "th"));

  const nameOf = (id) => lookup?.staff.find((u) => u.id === id)?.name || id;
  const co = (lookup?.assigned || []).filter((id) => !mains.includes(id));

  return (
    <div className="tw-panel" style={{ maxWidth: 860 }}>
      <div className="tw-sec">
        <div className="tw-sec-t">ข้อมูลชุดติว</div>
        <p className="tw-sec-d">ชื่อและคำอธิบายที่นักศึกษาเห็นบนการ์ดชุดติว</p>
        <div className="grid grid-2 gap-3">
          <div className="field"><label className="label" htmlFor="ts-title">ชื่อชุดติว <span className="c-danger">*</span></label>
            <input id="ts-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="field"><label className="label">รหัสชุด</label>
            <div className="input flex items-center mono" style={{ background: "var(--muted)" }}>{course.code}</div></div>
        </div>
        <div className="field"><label className="label" htmlFor="ts-desc">คำอธิบาย</label>
          <textarea id="ts-desc" className="input" rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="ติวเรื่องอะไร สำหรับสอบอะไร" /></div>
        <div className="label">สีการ์ด</div>
        <div className="flex gap-2 wrap">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setHero(c)} aria-label={"สี " + c} aria-pressed={hero === c}
              style={{ width: 34, height: 34, borderRadius: 9, background: c, cursor: "pointer", border: "3px solid " + (hero === c ? "var(--fg)" : "transparent"), display: "grid", placeItems: "center", color: "#fff" }}>
              {hero === c && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-sec">
        <div className="tw-sec-t">ใครเข้าชุดนี้ได้</div>
        <p className="tw-sec-d pretty">
          นักศึกษาเข้าได้เมื่อตรงทุกเงื่อนไขที่เลือก (ชั้นปี และ กลุ่มเรียน) หรือมีอีเมลอยู่ในรายชื่อพิเศษ
          ถ้าไม่เลือกอะไรเลย <strong>จะไม่มีนักศึกษาเห็นชุดนี้</strong> ต่างจากรายวิชาปกติที่ไม่เลือกคือเปิดให้ทุกชั้นปี
        </p>

        <div className="tw-warn" style={lock.open ? { background: "var(--success-soft)", color: "var(--success)" } : undefined} role="status">
          <Icon name={lock.open ? "checkC" : "alert"} size={15} style={{ flex: "0 0 15px", marginTop: 2 }} />
          <span>{lock.open ? `เข้าได้: ${lock.text}` : lock.text}{reach != null && <> · <b className="tnum">{reach}</b> คนเข้าได้ตามเงื่อนไขนี้</>}</span>
        </div>

        <div className="label mt-4">ชั้นปี</div>
        <div className="flex gap-2 wrap mb-4">
          {!lookup ? <span className="t-sm muted">กำลังโหลด…</span> : lookup.yearLabels.length === 0 ? <span className="t-sm muted">ยังไม่มีข้อมูลชั้นปีในระบบ</span> :
            lookup.yearLabels.filter((l) => yearNo(l)).map((label) => {
              const n = yearNo(label);
              const on = years.includes(n);
              return (
                <label key={label} className="t-sm" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "7px 13px", borderRadius: 9, border: "1.5px solid " + (on ? "var(--primary)" : "var(--border-strong)"), background: on ? "var(--primary-soft)" : "var(--card)", fontWeight: on ? 700 : 500, color: on ? "var(--primary-soft-fg)" : "var(--fg)" }}>
                  <input type="checkbox" checked={on} onChange={() => setYears((y) => (on ? y.filter((x) => x !== n) : [...y, n].sort((a, b) => a - b)))} />
                  {label}
                </label>
              );
            })}
        </div>

        <div className="field" style={{ maxWidth: 380 }}>
          <label className="label">กลุ่มเรียน / Section</label>
          <Select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">ไม่ระบุ Section</option>
            {sectionGroups.map(([year, secs]) => (
              <optgroup key={year} label={year}>{secs.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</optgroup>
            ))}
          </Select>
        </div>

        <div className="label">รายชื่อพิเศษ (เข้าได้โดยไม่ต้องตรงชั้นปี/กลุ่มเรียน)</div>
        <div className="flex gap-2 wrap items-center">
          {emails.map((e) => (
            <span key={e} className="tw-chip">{lookup?.students.find((s) => s.email === e)?.name || e}
              <button onClick={() => setEmails((l) => l.filter((x) => x !== e))} aria-label={"เอา " + e + " ออก"}><Icon name="x" size={12} /></button></span>
          ))}
          <button className="btn btn-outline btn-sm" onClick={() => setPicker("emails")} disabled={!lookup}><Icon name="plus" size={14} />เพิ่มนักศึกษา</button>
        </div>
      </div>

      {canManage && (
        <div className="tw-sec">
          <div className="tw-sec-t">ผู้รับผิดชอบ</div>
          <p className="tw-sec-d">อาจารย์ที่เห็นและแก้ชุดนี้ได้</p>
          <div className="label">อาจารย์ผู้รับผิดชอบหลัก</div>
          <div className="flex gap-2 wrap items-center mb-4">
            {mains.map((id) => <span key={id} className="tw-chip">{nameOf(id)}</span>)}
            <button className="btn btn-outline btn-sm" onClick={() => setPicker("mains")} disabled={!lookup}><Icon name="pencil" size={13} />เปลี่ยน</button>
          </div>
          <div className="label">อาจารย์ผู้สอนร่วม</div>
          <div className="flex gap-2 wrap items-center">
            {co.length === 0 && <span className="t-sm muted">ยังไม่มี</span>}
            {co.map((id) => <span key={id} className="tw-chip">{nameOf(id)}</span>)}
            <button className="btn btn-outline btn-sm" onClick={() => setPicker("co")} disabled={!lookup}><Icon name="plus" size={14} />จัดการผู้สอนร่วม</button>
          </div>
        </div>
      )}

      <div className="tw-sec flex items-center justify-between gap-3 wrap">
        {canManage ? (
          <button className="btn btn-outline c-danger" onClick={remove}><Icon name="trash" size={15} />ลบชุดติวนี้</button>
        ) : <span />}
        <button className="btn btn-primary" onClick={save} disabled={saving || !dirty}>
          <Icon name={saving ? "loader" : "check"} size={15} className={saving ? "spin" : ""} />{saving ? "กำลังบันทึก…" : "บันทึกชุดติว"}
        </button>
      </div>

      {picker === "emails" && (
        <PickerDialog title="รายชื่อพิเศษ" desc="นักศึกษาที่เลือกจะเข้าชุดนี้ได้ แม้ไม่ตรงชั้นปีหรือกลุ่มเรียน (ใช้กับอีเมลเก่าหรือกรณีพิเศษ)"
          items={lookup.students.map((s) => ({ id: s.email, label: s.name, sub: [s.student_no, s.email].filter(Boolean).join(" · ") }))}
          selected={emails} onClose={() => setPicker(null)} onSave={(ids) => { setEmails(ids); setPicker(null); }} />
      )}
      {picker === "mains" && (
        <PickerDialog title="อาจารย์ผู้รับผิดชอบหลัก" items={lookup.staff.map((u) => ({ id: u.id, label: u.name, sub: u.email }))}
          selected={mains} onClose={() => setPicker(null)} onSave={(ids) => { setMains(ids); setPicker(null); }} />
      )}
      {picker === "co" && (
        <PickerDialog title="อาจารย์ผู้สอนร่วม" desc="เห็นและแก้ชุดนี้ได้ แต่ไม่แก้ผู้รับผิดชอบหลัก"
          items={lookup.staff.filter((u) => !mains.includes(u.id)).map((u) => ({ id: u.id, label: u.name, sub: u.email }))}
          selected={co} onClose={() => setPicker(null)} onSave={saveCo} />
      )}
    </div>
  );
}
