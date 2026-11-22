"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import {
  canStudentAccessTutorSet,
  DEFAULT_DOMAIN,
  EXTERNAL_YEAR_BASE,
  type CourseAccessInput,
  type GradeRule,
  type SectionRule,
} from "@/lib/course-access";
import { isTutorOnlyRole } from "@/lib/roles";
import { lockSummary } from "@/lib/tutor-bank";
import RawIcon from "@/components/ui/Icon";
import { Select as RawSelect } from "@/components/ui/Primitives";
import { toast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import PickerDialog from "./PickerDialog";

const Icon = RawIcon as unknown as React.ComponentType<{
  name: string;
  size?: number;
  sw?: number;
  fill?: string;
  style?: React.CSSProperties;
  className?: string;
}>;
const Select = RawSelect as unknown as React.ComponentType<{
  id?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}>;

interface TutorCourseAccess {
  allowedEmails?: string[];
  [key: string]: unknown;
}

export interface TutorCourse {
  id: string;
  code?: string | null;
  title?: string | null;
  subtitle?: string | null;
  hero?: string | null;
  year_level?: number[] | null;
  section?: string | null;
  access?: TutorCourseAccess | Json | null;
  instructor?: string | null;
}

interface StudentUserRow {
  id: string;
  name: string;
  email: string | null;
  student_no: string | null;
  section: string | null;
  study_year: number | null;
  role: string | null;
}

interface StaffUserRow {
  id: string;
  name: string;
  email: string | null;
}

type SectionRow = Database["public"]["Tables"]["sections"]["Row"] & SectionRule;

interface YearOption {
  label: string;
  value: number;
  domain: string;
}

interface LookupState {
  mainIds: string[];
  students: StudentUserRow[];
  staff: StaffUserRow[];
  sections: SectionRow[];
  grades: GradeRule[];
  yearOptions: YearOption[];
  assigned: string[];
}

const COLORS = ["#4338a8", "#0d6e8c", "#1e5fa8", "#2f7d5b", "#b4530b", "#0b1220"];
const yearNo = (label: string) => parseInt(String(label).replace(/\D/g, ""), 10);
const normYears = (list: readonly (number | string)[] | null | undefined): number[] => (list || []).map(Number).filter(Boolean);
const sameList = <T,>(a: readonly T[], b: readonly T[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

function getAllowedEmails(access: TutorCourse["access"]): string[] {
  if (!access || typeof access !== "object" || Array.isArray(access)) return [];
  const list = (access as { allowedEmails?: unknown }).allowedEmails;
  return Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
}

// Checkable year levels. courses.year_level is integer[]: a school level locks by its number (read from the label), a
// level of an external domain by student_grades.year_no (the same key for every prefix of one label in that domain).
const yearOptionsOf = (grades: readonly GradeRule[]): YearOption[] => {
  const seen = new Map<number, YearOption>();
  for (const g of grades) {
    const domain = g.domain || DEFAULT_DOMAIN;
    const value = domain === DEFAULT_DOMAIN ? yearNo(g.year_label) : g.year_no;
    if (value && !seen.has(value)) seen.set(value, { label: g.year_label, value, domain });
  }
  return [...seen.values()].sort((a, b) => (a.domain === b.domain ? a.label.localeCompare(b.label, "th") : a.domain === DEFAULT_DOMAIN ? -1 : b.domain === DEFAULT_DOMAIN ? 1 : a.domain.localeCompare(b.domain)));
};

// Set details and the lock (who can enter). Tutor sets fail closed: with no year / section / email the set is open to
// nobody, and the live count below is computed with the same rule the API enforces (canStudentAccessTutorSet).
// canManage (admin / course_manager) also edits the responsible instructors and may delete the set.
export default function TutorSettings({
  course,
  canManage,
  onSaved,
}: {
  course: TutorCourse;
  canManage: boolean;
  onSaved: (fields: Database["public"]["Tables"]["courses_all"]["Update"]) => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [lookup, setLookup] = useState<LookupState | null>(null); // { students, staff, sections, yearOptions, grades, assigned }
  const [title, setTitle] = useState(course.title || "");
  const [subtitle, setSubtitle] = useState(course.subtitle || "");
  const [hero, setHero] = useState(course.hero || COLORS[0]);
  const [years, setYears] = useState(normYears(course.year_level));
  const [section, setSection] = useState(course.section || "");
  const [emails, setEmails] = useState(getAllowedEmails(course.access));
  const [mains, setMains] = useState<string[]>([]);
  const [picker, setPicker] = useState<"emails" | "mains" | "co" | null>(null); // "emails" | "mains" | "co"
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stRes, staffRes, secRes, gRes, ciRes] = await Promise.all([
        supabase.from("users").select("id, name, email, student_no, section, study_year, role").in("role", ["student", "tutor_guest"]),
        supabase.from("users").select("id, name, email").or("role.like.%instructor%,role.like.%course_manager%,role.like.%admin%"),
        supabase.from("sections").select("*").eq("status", "active"),
        supabase.from("student_grades").select("prefix, year_label, domain, year_no"),
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
        yearOptions: yearOptionsOf(gRes.data || []),
        assigned: (ciRes.data || []).map((r) => r.user_id),
      });
    })();
    return () => { cancelled = true; };
  }, [course.id, course.instructor]);

  const baseAccess =
    course.access && typeof course.access === "object" && !Array.isArray(course.access)
      ? (course.access as Record<string, unknown>)
      : {};
  const draftAccess: Json = { ...(baseAccess as Record<string, Json>), allowedEmails: emails };
  const draft: CourseAccessInput = { kind: "tutor", section: section || null, year_level: years, access: draftAccess };
  const lock = lockSummary(draft);
  const reach = useMemo(() => {
    if (!lookup) return null;
    return lookup.students.filter((s) =>
      canStudentAccessTutorSet(draft, { email: s.email, studentNo: s.student_no, section: s.section, studyYear: s.study_year, tutorOnly: isTutorOnlyRole(s.role) }, lookup.sections, lookup.grades)
    ).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, section, years, emails]);

  const dirty = title !== (course.title || "") || subtitle !== (course.subtitle || "") || hero !== (course.hero || COLORS[0]) ||
    section !== (course.section || "") || !sameList(years, normYears(course.year_level)) ||
    !sameList(emails, getAllowedEmails(course.access)) || Boolean(canManage && lookup && !sameList(mains, lookup.mainIds));

  const save = async () => {
    if (!title.trim()) return toast("กรุณากรอกชื่อชุดติว", "warning");
    setSaving(true);
    try {
      const fields: Database["public"]["Tables"]["courses_all"]["Update"] = {
        title: title.trim(),
        subtitle,
        hero,
        year_level: years,
        section: section || null,
        access: draftAccess,
      };
      if (canManage && lookup && mains.length > 0) {
        fields.instructor = mains.map((id) => lookup.staff.find((u) => u.id === id)?.name).filter(Boolean).join(", ");
      }
      const { error } = await supabase.from("courses_all").update(fields).eq("id", course.id);
      if (error) throw error;
      if (canManage && lookup) {
        const missing = mains.filter((id) => !lookup.assigned.includes(id));
        if (missing.length) {
          await supabase.from("course_instructors").insert(missing.map((user_id) => ({ course_id: course.id, user_id })));
          setLookup((l) => (l ? { ...l, assigned: [...l.assigned, ...missing] } : l));
        }
        setLookup((l) => (l ? { ...l, mainIds: mains } : l));
      }
      onSaved(fields);
      toast("บันทึกชุดติวแล้ว");
    } catch (err: unknown) {
      toast("บันทึกไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveCo = async (ids: string[]) => {
    if (!lookup) return;
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
    setLookup((l) => (l ? { ...l, assigned: [...l.assigned.filter((id) => !del.includes(id)), ...add] } : l));
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
    } catch (err: unknown) {
      toast("ลบไม่สำเร็จ: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const sectionGroups = Object.entries((lookup?.sections || []).reduce<Record<string, SectionRow[]>>((acc, s) => {
    const y = s.year_level || "ไม่ระบุชั้นปี";
    (acc[y] ||= []).push(s);
    return acc;
  }, {})).sort(([a], [b]) => a.localeCompare(b, "th"));

  const nameOf = (id: string) => lookup?.staff.find((u) => u.id === id)?.name || id;
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
          {!lookup ? <span className="t-sm muted">กำลังโหลด…</span> : lookup.yearOptions.length === 0 ? <span className="t-sm muted">ยังไม่มีข้อมูลชั้นปีในระบบ</span> :
            lookup.yearOptions.map(({ label, value, domain }) => {
              const on = years.includes(value);
              return (
                <label key={value} className="t-sm" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "7px 13px", borderRadius: 9, border: "1.5px solid " + (on ? "var(--primary)" : "var(--border-strong)"), background: on ? "var(--primary-soft)" : "var(--card)", fontWeight: on ? 700 : 500, color: on ? "var(--primary-soft-fg)" : "var(--fg)" }}>
                  <input type="checkbox" checked={on} onChange={() => setYears((y) => (on ? y.filter((x) => x !== value) : [...y, value].sort((a, b) => a - b)))} />
                  {label}
                  {domain !== DEFAULT_DOMAIN && <span className="t-xs muted">({domain})</span>}
                </label>
              );
            })}
          {lookup && years.filter((y) => y >= EXTERNAL_YEAR_BASE && !lookup.yearOptions.some((o) => o.value === y)).map((y) => (
            // a lock on an external year level that no longer exists matches nobody: show it so it can be unticked
            <label key={y} className="t-sm" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "7px 13px", borderRadius: 9, border: "1.5px dashed var(--danger)", color: "var(--danger)" }}>
              <input type="checkbox" checked onChange={() => setYears((l) => l.filter((x) => x !== y))} />
              ชั้นปีที่ถูกลบ <span className="t-xs">(รหัส {y})</span>
            </label>
          ))}
        </div>

        <div className="field" style={{ maxWidth: 380 }}>
          <label className="label">กลุ่มเรียน / Section</label>
          <Select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">ไม่ระบุ Section</option>
            {sectionGroups.map(([year, secs]) => (
              <optgroup key={year} label={year}>{secs.map((s) => <option key={s.id} value={s.name ?? ""}>{s.name}</option>)}</optgroup>
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

      {picker === "emails" && lookup && (
        <PickerDialog title="รายชื่อพิเศษ" desc="นักศึกษาที่เลือกจะเข้าชุดนี้ได้ แม้ไม่ตรงชั้นปีหรือกลุ่มเรียน (ใช้กับอีเมลเก่าหรือกรณีพิเศษ)"
          items={lookup.students.map((s) => ({ id: s.email || "", label: s.name, sub: [s.student_no, s.email].filter(Boolean).join(" · ") }))}
          selected={emails} onClose={() => setPicker(null)} onSave={(ids) => { setEmails(ids); setPicker(null); }} />
      )}
      {picker === "mains" && lookup && (
        <PickerDialog title="อาจารย์ผู้รับผิดชอบหลัก" items={lookup.staff.map((u) => ({ id: u.id, label: u.name, sub: u.email }))}
          selected={mains} onClose={() => setPicker(null)} onSave={(ids) => { setMains(ids); setPicker(null); }} />
      )}
      {picker === "co" && lookup && (
        <PickerDialog title="อาจารย์ผู้สอนร่วม" desc="เห็นและแก้ชุดนี้ได้ แต่ไม่แก้ผู้รับผิดชอบหลัก"
          items={lookup.staff.filter((u) => !mains.includes(u.id)).map((u) => ({ id: u.id, label: u.name, sub: u.email }))}
          selected={co} onClose={() => setPicker(null)} onSave={saveCo} />
      )}
    </div>
  );
}
