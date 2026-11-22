"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { hasRole } from "@/lib/roles";
import { bankWarning, lockSummary } from "@/lib/tutor-bank";
import RawIcon from "@/components/ui/Icon";
import { Crumb as RawCrumb } from "@/components/ui/Shared";
import RawLoading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { useConfirm as rawUseConfirm } from "@/components/ui/ConfirmDialog";
import LessonPanel, { type TutorLessonDoc, type TutorLessonItem } from "@/components/tutor/LessonPanel";
import TutorSettings from "@/components/tutor/TutorSettings";
import TutorResults from "@/components/tutor/TutorResults";

interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  fill?: string;
  style?: React.CSSProperties;
  className?: string;
}

interface CrumbItem {
  label: React.ReactNode;
  to?: string;
  onClick?: () => void;
}

interface CrumbProps {
  items?: CrumbItem[];
  nav?: (path: string) => void;
}

interface LoadingProps {
  text?: string;
  fullHeight?: boolean;
  className?: string;
}

type ConfirmFn = (options: {
  title?: string;
  desc?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) => Promise<boolean>;

const Icon = RawIcon as unknown as React.ComponentType<IconProps>;
const Crumb = RawCrumb as unknown as React.ComponentType<CrumbProps>;
const Loading = RawLoading as unknown as React.ComponentType<LoadingProps>;
const useConfirm = rawUseConfirm as unknown as () => ConfirmFn;

type CourseRow = Database["public"]["Tables"]["courses_all"]["Row"];
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];

interface WorkspaceLesson extends TutorLessonItem {
  id: string;
  course_id?: string | null;
  index: number | null;
  title?: string | null;
  description?: string | null;
  status: string | null;
  tutor_draw_count?: number | null;
}

interface BankStats {
  count: number;
  topics: number;
}

function parseDocList(raw: Json | null): TutorLessonDoc[] | null {
  if (!Array.isArray(raw)) return null;
  const docs: TutorLessonDoc[] = [];
  for (const item of raw) {
    if (typeof item === "object" && item !== null) {
      const rec = item as { name?: unknown; size?: unknown; path?: unknown; url?: unknown };
      docs.push({
        name: typeof rec.name === "string" ? rec.name : String(rec.name ?? ""),
        size: typeof rec.size === "string" ? rec.size : String(rec.size ?? ""),
        ...(typeof rec.path === "string" ? { path: rec.path } : {}),
        url: typeof rec.url === "string" ? rec.url : String(rec.url ?? ""),
      });
    }
  }
  return docs;
}

function toWorkspaceLesson(row: LessonRow): WorkspaceLesson {
  return {
    ...row,
    documents: parseDocList(row.documents),
    ai_documents: parseDocList(row.ai_documents),
  };
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return String(err);
}

const newLessonId = () => "l_" + Date.now();

// The instructor workspace of one tutor set: lessons on the left (each with its bank health), the selected lesson on
// the right, set details + the access lock on a second tab. Replaces the course pages for tutor sets.
function Workspace() {
  const router = useRouter();
  const nav = (path: string) => router.push(path);
  const confirm = useConfirm();
  const rawCourseId = useParams()?.id;
  const courseId = typeof rawCourseId === "string" ? rawCourseId : Array.isArray(rawCourseId) ? rawCourseId[0] : undefined;
  const wanted = useSearchParams().get("lesson");
  const { data: session } = useSession();
  const user = session?.user;
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [course, setCourse] = useState<CourseRow | null>(null);
  const [lessons, setLessons] = useState<WorkspaceLesson[]>([]);
  const [bank, setBank] = useState<Record<string, BankStats>>({}); // lessonId -> { count, topics }
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<"lessons" | "results" | "settings">("lessons");
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading"); // loading | ready | missing
  const canManage = hasRole(user?.role, "admin", "course_manager");

  useEffect(() => {
    if (!user || !courseId) return;
    let cancelled = false;
    (async () => {
      // courses_all, not the `courses` view: the view hides tutor sets.
      const [cRes, lRes, ciRes] = await Promise.all([
        supabase.from("courses_all").select("*").eq("id", courseId).maybeSingle(),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("index", { ascending: true }),
        supabase.from("course_instructors").select("user_id").eq("course_id", courseId),
      ]);
      if (cancelled) return;
      const c = cRes.data;
      if (!c) return setState("missing");
      if (c.kind !== "tutor") return router.replace("/i/course/" + courseId);

      const assigned = (ciRes.data || []).some((r) => r.user_id === user.id);
      const allowed = hasRole(user.role, "admin") ||
        (hasRole(user.role, "course_manager") && (c.group_id === user.group_id || Boolean(c.group_id && user.group_ids?.includes(c.group_id)) || assigned)) ||
        (hasRole(user.role, "instructor") && assigned);
      if (!allowed) {
        toast("คุณไม่มีสิทธิ์จัดการชุดติวนี้", "error");
        return router.replace("/i/tutor");
      }

      const ls = (lRes.data || []).map(toWorkspaceLesson);
      const ids = ls.map((l) => l.id);
      const [qRes, tRes] = ids.length
        ? await Promise.all([
            supabase.from("questions").select("lesson_id, topic_id").eq("kind", "tutor").in("lesson_id", ids),
            supabase.from("tutor_topics").select("lesson_id").in("lesson_id", ids),
          ])
        : [{ data: [] }, { data: [] }];
      if (cancelled) return;
      const b: Record<string, BankStats> = {};
      for (const l of ls) b[l.id] = { count: 0, topics: 0 };
      for (const q of qRes.data || []) {
        if (q.lesson_id && b[q.lesson_id]) b[q.lesson_id].count += 1;
      }
      for (const t of tRes.data || []) {
        if (t.lesson_id && b[t.lesson_id]) b[t.lesson_id].topics += 1;
      }
      setCourse(c);
      setLessons(ls);
      setBank(b);
      setSel(ls.some((l) => l.id === wanted) ? wanted : ls[0]?.id || null);
      setState("ready");
    })().catch((e: unknown) => { toast("โหลดข้อมูลไม่สำเร็จ: " + getErrorMessage(e), "error"); setState("missing"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseId]);

  const patchLesson = (id: string, fields: Partial<WorkspaceLesson>) =>
    setLessons((ls) => ls.map((l) => (l.id === id ? { ...l, ...fields } : l)));

  const saveLesson = (id: string) => async (fields: Partial<TutorLessonItem>) => {
    const updatePayload = fields as unknown as Database["public"]["Tables"]["lessons"]["Update"];
    const { error } = await supabase.from("lessons").update(updatePayload).eq("id", id);
    if (error) { toast("บันทึกไม่สำเร็จ: " + error.message, "error"); return false; }
    patchLesson(id, fields);
    return true;
  };

  const addLesson = async () => {
    if (!courseId) return;
    const row = {
      id: newLessonId(),
      course_id: courseId,
      index: Math.max(0, ...lessons.map((l) => l.index || 0)) + 1,
      title: "บทเรียนใหม่",
      description: "",
      status: "draft",
    };
    const { error } = await supabase.from("lessons").insert([row]);
    if (error) return toast("เพิ่มบทเรียนไม่สำเร็จ: " + error.message, "error");
    setLessons((ls) => [...ls, row]);
    setBank((b) => ({ ...b, [row.id]: { count: 0, topics: 0 } }));
    setTab("lessons");
    pick(row.id);
  };

  const pick = (id: string) => {
    setSel(id);
    // narrow screens stack the rail above the panel: bring the panel into view
    const narrow = gridRef.current && getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length === 1;
    if (narrow) setTimeout(() => document.getElementById("tw-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const move = async (dir: number) => {
    const i = lessons.findIndex((l) => l.id === sel);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= lessons.length) return;
    const [a, b] = [lessons[i], lessons[j]];
    const res = await Promise.all([
      supabase.from("lessons").update({ index: b.index }).eq("id", a.id),
      supabase.from("lessons").update({ index: a.index }).eq("id", b.id),
    ]);
    if (res.some((r) => r.error)) return toast("จัดลำดับไม่สำเร็จ", "error");
    setLessons((ls) => ls.map((l) => (l.id === a.id ? { ...l, index: b.index } : l.id === b.id ? { ...l, index: a.index } : l)).sort((x, y) => (x.index ?? 0) - (y.index ?? 0)));
  };

  const removeLesson = async () => {
    const l = lessons.find((x) => x.id === sel);
    if (!l) return;
    const ok = await confirm({
      title: "ลบบทเรียน",
      message: `ลบบท “${l.title}” ใช่หรือไม่?\n\nข้อสอบในคลัง หัวข้อ และผลการทำข้อสอบของนักศึกษาในบทนี้จะถูกลบถาวร`,
      danger: true, confirmText: "ลบบทเรียน", cancelText: "ยกเลิก",
    });
    if (!ok) return;
    const { error: qErr } = await supabase.from("questions").delete().eq("lesson_id", l.id);
    if (qErr) return toast("ลบไม่สำเร็จ: " + qErr.message, "error");
    const { error } = await supabase.from("lessons").delete().eq("id", l.id);
    if (error) return toast("ลบไม่สำเร็จ: " + error.message, "error");
    const rest = lessons.filter((x) => x.id !== l.id);
    setLessons(rest);
    setSel(rest[0]?.id || null);
    toast("ลบบทเรียนแล้ว");
  };

  if (state === "loading") return <Loading className="container p-5 text-center muted" />;
  if (state === "missing" || !course) {
    return (
      <div className="container"><div className="card"><div className="empty">
        <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
        <div className="fw-6 fg">ไม่พบชุดติว</div>
        <button className="btn btn-outline btn-sm" onClick={() => nav("/i/tutor")}>กลับไปรายการชุดติว</button>
      </div></div></div>
    );
  }

  const lock = lockSummary(course);
  const total = lessons.reduce((n, l) => n + (bank[l.id]?.count || 0), 0);
  const published = lessons.filter((l) => l.status === "active").length;
  const short = lessons.filter((l) => bankWarning(bank[l.id]?.count || 0, l.tutor_draw_count)).length;
  const current = lessons.find((l) => l.id === sel);
  const idx = lessons.findIndex((l) => l.id === sel);

  return (
    <div className="container">
      <Crumb nav={nav} items={[{ label: "ชุดติว", to: "/i/tutor" }, { label: course.code }]} />
      <div className="tw-head">
        <div style={{ minWidth: 0 }}>
          <div className="flex items-center gap-2"><span className="tw-tag">โหมดติว</span><span className="tw-tag mono">{course.code}</span></div>
          <h1>{course.title}</h1>
          <div className="tw-stats">
            <span><b>{lessons.length}</b>บทเรียน</span>
            <span><b>{published}</b>เผยแพร่แล้ว</span>
            <span><b>{total}</b>ข้อในคลัง</span>
            {short > 0 && <span><b>{short}</b>บทคลังไม่พอ</span>}
          </div>
        </div>
        <div className="flex col gap-2" style={{ alignItems: "flex-end" }}>
          <button className={"tw-lock " + (lock.open ? "ok" : "warn")} onClick={() => canManage && setTab("settings")} title={canManage ? "ไปที่การตั้งค่าการเข้าถึง" : undefined}>
            <Icon name={lock.open ? "unlock" : "lock"} size={15} />{lock.text}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => nav("/s/tutor/" + course.id)}><Icon name="eye" size={14} />ดูมุมมองนักศึกษา</button>
        </div>
      </div>

      <div className="tabs mb-4">
        <button className={tab === "lessons" ? "on" : ""} onClick={() => setTab("lessons")}><Icon name="video" size={15} />บทเรียนและคลังข้อสอบ</button>
        <button className={tab === "results" ? "on" : ""} onClick={() => setTab("results")}><Icon name="chart" size={15} />ผลการทำข้อสอบ</button>
        {canManage && <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}><Icon name="settings" size={15} />ตั้งค่าและการเข้าถึง</button>}
      </div>

      {tab === "settings" && canManage ? (
        <TutorSettings course={course} canManage={canManage} onSaved={(f) => setCourse((c) => (c ? { ...c, ...f, id: c.id } : c))} />
      ) : tab === "results" ? (
        <TutorResults course={course} lessons={lessons} />
      ) : (
        <div className="tw-grid" ref={gridRef}>
          <div className="tw-rail">
            <div className="tw-rail-h">
              <div className="t-base fw-7">บทเรียน ({lessons.length})</div>
              <button className="btn btn-primary btn-sm" onClick={addLesson}><Icon name="plus" size={14} />เพิ่มบทเรียน</button>
            </div>
            {lessons.length === 0 && <div className="p-5 t-sm muted">ยังไม่มีบทเรียน กด “เพิ่มบทเรียน” เพื่อสร้างบทแรก แล้วเพิ่มวิดีโอและข้อสอบในคลัง</div>}
            {lessons.map((l) => {
              const b = bank[l.id] || { count: 0, topics: 0 };
              const warn = bankWarning(b.count, l.tutor_draw_count);
              return (
                <button key={l.id} className={"tw-item" + (l.id === sel ? " on" : "")} onClick={() => pick(l.id)} aria-current={l.id === sel}>
                  <span className="tw-no">{String(l.index ?? "").padStart(2, "0")}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="fw-6 truncate" style={{ display: "block" }}>{l.title || "(ไม่มีชื่อบทเรียน)"}</span>
                    <span className="tw-meta">
                      <span className={l.status === "active" ? "ok" : ""}>{l.status === "active" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</span>
                      <span>คลัง {b.count} ข้อ</span>
                      {warn && <span className="warn">คลังไม่พอ</span>}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div id="tw-panel">
            {current ? (
              <LessonPanel key={current.id} lesson={current} bank={bank[current.id] || { count: 0, topics: 0 }}
                save={saveLesson(current.id)} onMove={move} onDelete={removeLesson} canUp={idx > 0} canDown={idx < lessons.length - 1} />
            ) : (
              <div className="tw-panel"><div className="empty">
                <div className="ec"><Icon name="video" size={22} /></div>
                <div className="fw-6 fg">เริ่มจากบทแรก</div>
                <div className="t-sm muted pretty">แต่ละบทมีวิดีโอ (ถ้ามี) และคลังข้อสอบของตัวเอง</div>
                <button className="btn btn-primary" onClick={addLesson}><Icon name="plus" size={15} />เพิ่มบทเรียน</button>
              </div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InstructorTutorSet() {
  return (
    <Suspense fallback={<Loading className="container p-5 text-center muted" />}>
      <Workspace />
    </Suspense>
  );
}
