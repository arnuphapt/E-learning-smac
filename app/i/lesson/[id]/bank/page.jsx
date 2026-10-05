"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizeTopic, findTopic, bankWarning, parseDrawCount } from "@/lib/tutor-bank";
import { uniqueChoiceId } from "@/lib/questions";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog } from "@/components/ui/Primitives";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

const blankQuestion = () => ({
  id: null,
  text: "",
  choices: [{ id: "a", text: "" }, { id: "b", text: "" }],
  answer: "a",
  explanation: "",
  topicName: "",
});

function QuestionEditor({ q, topics, onClose, onSave }) {
  const [text, setText] = useState(q.text);
  const [choices, setChoices] = useState(q.choices);
  const [answer, setAnswer] = useState(q.answer);
  const [explanation, setExplanation] = useState(q.explanation);
  const [topicName, setTopicName] = useState(q.topicName);
  const [saving, setSaving] = useState(false);

  const setC = (id, v) => setChoices((cs) => cs.map((c) => (c.id === id ? { ...c, text: v } : c)));
  const addC = () => setChoices((cs) => [...cs, { id: uniqueChoiceId(), text: "" }]);
  // Ids are never re-lettered and never reused (uniqueChoiceId): tutor_answers.chosen and the settled result store them and
  // the review reads the choices live. Labels A, B, C... below are by position. Deleting the current answer leaves none
  // selected (submit asks for a new pick).
  const removeC = (id) => {
    setChoices(choices.filter((c) => c.id !== id));
    if (answer === id) setAnswer("");
  };

  const submit = async () => {
    if (!text.trim()) return toast("กรุณาพิมพ์โจทย์คำถาม", "error");
    if (choices.some((c) => !c.text.trim())) return toast("กรุณากรอกตัวเลือกให้ครบทุกข้อ", "error");
    if (!choices.some((c) => c.id === answer)) return toast("กรุณาเลือกคำตอบที่ถูกต้อง", "error");
    setSaving(true);
    await onSave({ ...q, text: text.trim(), choices, answer, explanation: explanation.trim(), topicName });
    setSaving(false);
  };

  return (
    <Dialog title={q.id ? "แก้ไขข้อสอบในคลัง" : "เพิ่มข้อสอบเข้าคลัง"} desc="ข้อสอบปรนัย เลือกคำตอบที่ถูกต้อง 1 ข้อ" onClose={onClose} lg
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={submit} disabled={saving}><Icon name="check" size={15} />บันทึกข้อสอบ</button></>}>
      <div className="field"><label className="label">โจทย์คำถาม</label><textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="พิมพ์โจทย์คำถาม…" /></div>
      <label className="label">ตัวเลือก <span className="muted fw-4">— เลือกวงกลมเพื่อกำหนดคำตอบที่ถูกต้อง</span></label>
      <div className="flex col gap-2 mb-2">
        {choices.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <button onClick={() => setAnswer(c.id)} style={{ width: 24, height: 24, borderRadius: 99, border: "2px solid " + (answer === c.id ? "var(--success)" : "#cbd5e1"), background: "#fff", cursor: "pointer", display: "grid", placeItems: "center", flex: "0 0 24px" }}>
              {answer === c.id && <span style={{ width: 11, height: 11, borderRadius: 99, background: "var(--success)" }} />}
            </button>
            <input className="input" value={c.text} onChange={(e) => setC(c.id, e.target.value)} placeholder={"ตัวเลือก " + String.fromCharCode(65 + i)} />
            {choices.length > 2 && <button className="iconbtn ghost c-danger" onClick={() => removeC(c.id)}><Icon name="trash" size={15} /></button>}
          </div>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm c-primary mb-3" onClick={addC}><Icon name="plus" size={15} />เพิ่มตัวเลือก</button>
      <div className="field">
        <label className="label">คำอธิบายเฉลย <span className="muted fw-4">— นักศึกษาเห็นหลังส่งชุดข้อสอบเท่านั้น</span></label>
        <textarea className="input" rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="อธิบายว่าทำไมข้อนี้ถึงเป็นคำตอบที่ถูก…" />
      </div>
      <div className="field">
        <label className="label">หัวข้อ <span className="muted fw-4">— พิมพ์เองหรือเลือกจากหัวข้อที่ใช้แล้วในบทนี้ (เว้นว่างได้)</span></label>
        <input className="input" list="tutor-topics" value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="เช่น ภาวะหัวใจล้มเหลว" />
        <datalist id="tutor-topics">{topics.map((t) => <option key={t.id} value={t.name} />)}</datalist>
      </div>
    </Dialog>
  );
}

export default function TutorBank() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const confirm = useConfirm();
  const lessonId = useParams()?.id;

  const [state, setState] = useState({ loading: true, lesson: null, course: null, questions: [], topics: [] });
  const [editing, setEditing] = useState(null);
  const [whole, setWhole] = useState(true);
  const [drawInput, setDrawInput] = useState("");

  const fetchAll = useCallback(async () => {
    const [qRes, tRes] = await Promise.all([
      supabase.from("questions").select("*").eq("lesson_id", lessonId).eq("kind", "tutor").order("no", { ascending: true }),
      supabase.from("tutor_topics").select("*").eq("lesson_id", lessonId).order("created_at", { ascending: true }),
    ]);
    if (qRes.error || tRes.error) throw qRes.error || tRes.error;
    return { questions: qRes.data || [], topics: tRes.data || [] };
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      // the bank does not depend on the lesson row, so load both at once; the course needs lesson.course_id
      const [{ data: lesson }, rest] = await Promise.all([
        supabase.from("lessons").select("*").eq("id", lessonId).single(),
        fetchAll(),
      ]);
      if (!lesson) { if (!cancelled) setState((s) => ({ ...s, loading: false })); return; }
      // courses_all, not the `courses` view: the view hides tutor sets.
      const { data: course } = await supabase.from("courses_all").select("*").eq("id", lesson.course_id).single();
      if (cancelled) return;
      setState({ loading: false, lesson, course, ...rest });
      setWhole(lesson.tutor_draw_count == null);
      setDrawInput(lesson.tutor_draw_count == null ? "" : String(lesson.tutor_draw_count));
    })().catch((e) => { toast("โหลดข้อมูลไม่สำเร็จ: " + e.message, "error"); setState((s) => ({ ...s, loading: false })); });
    return () => { cancelled = true; };
  }, [lessonId, fetchAll]);

  // Reload the bank, drop topics no question uses any more, so "lesson has topics" stays true only for real topics.
  const refresh = async () => {
    let rest = await fetchAll();
    const used = new Set(rest.questions.map((q) => q.topic_id).filter(Boolean));
    const unused = rest.topics.filter((t) => !used.has(t.id)).map((t) => t.id);
    if (unused.length) {
      const { error } = await supabase.from("tutor_topics").delete().in("id", unused);
      if (!error) rest = { ...rest, topics: rest.topics.filter((t) => used.has(t.id)) };
    }
    setState((s) => ({ ...s, ...rest }));
  };

  const topicIdFor = async (name, topics) => {
    const n = normalizeTopic(name);
    if (!n) return null;
    const hit = findTopic(topics, n);
    if (hit) return hit.id;
    const id = "tt_" + Date.now() + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("tutor_topics").insert([{ id, lesson_id: lessonId, name: n }]);
    if (!error) return id;
    // lost a race / stale list: the name already exists, use that row
    const { data } = await supabase.from("tutor_topics").select("*").eq("lesson_id", lessonId);
    const again = findTopic(data || [], n);
    if (again) return again.id;
    throw error;
  };

  const saveQuestion = async (q) => {
    try {
      const topic_id = await topicIdFor(q.topicName, state.topics);
      const row = {
        type: "single",
        text: q.text,
        choices: q.choices,
        answer: q.answer,
        explanation: q.explanation || null,
        topic_id,
        lesson_id: lessonId,
        kind: "tutor",
      };
      const { error } = q.id
        ? await supabase.from("questions").update(row).eq("id", q.id)
        : await supabase.from("questions").insert([{ ...row, id: "q_" + Date.now(), no: Math.max(0, ...state.questions.map((x) => x.no || 0)) + 1 }]);
      if (error) throw error;
      toast(q.id ? "บันทึกข้อสอบแล้ว" : "เพิ่มข้อสอบเข้าคลังแล้ว");
      setEditing(null);
      await refresh();
    } catch (e) {
      toast("เกิดข้อผิดพลาด: " + e.message, "error");
    }
  };

  const deleteQuestion = async (q) => {
    const ok = await confirm({ title: "ลบข้อสอบ", message: "ลบข้อสอบนี้ออกจากคลังใช่หรือไม่?", danger: true, confirmText: "ลบ", cancelText: "ยกเลิก" });
    if (!ok) return;
    const { error } = await supabase.from("questions").delete().eq("id", q.id);
    if (error) return toast("เกิดข้อผิดพลาด: " + error.message, "error");
    toast("ลบข้อสอบเรียบร้อยแล้ว");
    await refresh().catch((e) => toast("โหลดคลังไม่สำเร็จ: " + e.message, "error"));
  };

  const saveDraw = async () => {
    const value = whole ? null : parseDrawCount(drawInput);
    // unchecking "ใช้ทั้งคลัง" needs a real number: blank/invalid must not silently save NULL (= whole bank)
    if (!whole && !value) return toast("กรุณากรอกจำนวนข้อต่อรอบเป็นเลขจำนวนเต็มมากกว่า 0 หรือเลือก \"ใช้ทั้งคลัง\"", "error");
    const { error } = await supabase.from("lessons").update({ tutor_draw_count: value }).eq("id", lessonId);
    if (error) return toast("เกิดข้อผิดพลาด: " + error.message, "error");
    setState((s) => ({ ...s, lesson: { ...s.lesson, tutor_draw_count: value } }));
    toast("บันทึกการตั้งค่าแล้ว");
  };

  const { loading, lesson, course, questions, topics } = state;
  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!lesson || !course) {
    return <div className="container p-5"><div className="card"><div className="empty"><div className="fw-6 fg">ไม่พบบทเรียน</div></div></div></div>;
  }
  if (course.kind !== "tutor") {
    return (
      <div className="container p-5"><div className="card"><div className="empty">
        <div className="fw-6 fg">บทนี้ไม่ได้อยู่ในชุดติว</div>
        <div className="t-sm muted">คลังข้อสอบใช้ได้เฉพาะบทของชุดติว ข้อสอบ Pre/Post ของรายวิชาจัดการที่หน้าแก้ไขบทเรียน</div>
        <button className="btn btn-outline btn-sm" onClick={() => nav("/i/lesson/" + lesson.id)}>ไปหน้าแก้ไขบทเรียน</button>
      </div></div></div>
    );
  }

  const topicName = (id) => topics.find((t) => t.id === id)?.name;
  const draftValue = whole ? null : parseDrawCount(drawInput);
  const warning = bankWarning(questions.length, draftValue ?? null);

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "ชุดติว", to: "/i/tutor" }, { label: course.code, to: "/i/course/" + course.id }, { label: "บทที่ " + lesson.index + " · คลังข้อสอบ" }]} />
      <PageHead kicker={"คลังข้อสอบชุดติว · " + course.code} title={lesson.title}
        desc="ข้อสอบในคลังนี้ นักศึกษาจะเห็นผ่านหน้าทำข้อสอบของชุดติวเท่านั้น และเห็นเฉลยหลังส่งชุดข้อสอบ"
        right={<button className="btn btn-outline" onClick={() => nav("/i/lesson/" + lesson.id)}><Icon name="pencil" size={15} />จัดการบทเรียน</button>} />

      <div className="flex gap-5 items-start wrap">
        <div className="flex-1" style={{ minWidth: 300 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="t-base fw-7">คลังข้อสอบ ({questions.length} ข้อ · {topics.length} หัวข้อ)</div>
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(blankQuestion())}><Icon name="plus" size={15} />เพิ่มข้อสอบ</button>
          </div>
          <div className="flex col gap-3">
            {questions.length === 0 && (
              <div className="card empty pointer" onClick={() => setEditing(blankQuestion())} style={{ borderStyle: "dashed", padding: "40px 0" }}>
                <div className="ec"><Icon name="clipboard" size={22} style={{ color: "var(--subtle)" }} /></div>
                <div className="t-sm muted">ยังไม่มีข้อสอบในคลัง คลิกเพื่อเพิ่มข้อแรก</div>
              </div>
            )}
            {questions.map((q, i) => (
              <div key={q.id} className="card card-p">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 wrap">
                      <Badge tone="primary">ข้อ {i + 1}</Badge>
                      {topicName(q.topic_id) ? <Badge tone="info">{topicName(q.topic_id)}</Badge> : <Badge tone="muted">ไม่มีหัวข้อ</Badge>}
                      {!q.explanation && <Badge tone="warning">ยังไม่มีคำอธิบาย</Badge>}
                    </div>
                    <div className="t-sm fw-6 pretty mb-2">{q.text}</div>
                    <div className="flex col gap-1">
                      {(q.choices || []).map((c) => (
                        <div key={c.id} className="flex items-center gap-2 t-sm" style={{ color: c.id === q.answer ? "var(--success)" : "var(--muted-fg)", fontWeight: c.id === q.answer ? 600 : 400 }}>
                          <Icon name={c.id === q.answer ? "checkC" : "circle"} size={14} />{c.text}
                        </div>
                      ))}
                    </div>
                    {q.explanation && <div className="t-xs muted mt-2 pretty" style={{ whiteSpace: "pre-line" }}>คำอธิบาย: {q.explanation}</div>}
                  </div>
                  <div className="flex col gap-1">
                    <button className="iconbtn ghost" onClick={() => setEditing({ id: q.id, text: q.text || "", choices: q.choices || blankQuestion().choices, answer: q.answer || "a", explanation: q.explanation || "", topicName: topicName(q.topic_id) || "" })}><Icon name="pencil" size={15} /></button>
                    <button className="iconbtn ghost c-danger" onClick={() => deleteQuestion(q)}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 300, flex: "0 0 300px" }}>
          <div className="card card-p">
            <div className="t-sm fw-7 mb-3">จำนวนข้อต่อรอบ</div>
            <label className="flex items-center gap-2 t-sm mb-3" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />ใช้ทั้งคลัง
            </label>
            <div className="field">
              <label className="label">หรือกำหนดจำนวนข้อต่อรอบ</label>
              <input className="input" inputMode="numeric" value={drawInput} disabled={whole} onChange={(e) => setDrawInput(e.target.value.replace(/[^0-9]/g, ""))} placeholder="เช่น 20" />
            </div>
            {warning && (
              <div className="t-xs pretty mb-3" style={{ padding: "8px 10px", borderRadius: 8, background: "var(--warning-soft)", color: "var(--warning)" }}>
                <Icon name="alert" size={13} /> {warning}
              </div>
            )}
            <button className="btn btn-primary btn-block" onClick={saveDraw}><Icon name="check" size={15} />บันทึกการตั้งค่า</button>
          </div>
        </div>
      </div>

      {editing && <QuestionEditor q={editing} topics={topics} onClose={() => setEditing(null)} onSave={saveQuestion} />}
    </div>
  );
}
