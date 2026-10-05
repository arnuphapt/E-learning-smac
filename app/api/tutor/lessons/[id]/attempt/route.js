import { NextResponse } from "next/server";
import { tutorCaller, loadTutorCourse, tutorNotFound, settleAttempt } from "@/lib/tutor-server";
import { drawQuestions, roundSize } from "@/lib/tutor-draw";
import { deadlineFor, isPastDeadline, minutesFor } from "@/lib/tutor-attempt";

// Tutor attempt of ONE lesson. Identity is the session (never a user id from the client); the lock on the lesson's
// tutor set is checked with canOpen(); every DB access is the service role.
//   GET  /api/tutor/lessons/<lessonId>/attempt  -> preview (question count + minutes) and whether a round is open. No questions.
//   POST /api/tutor/lessons/<lessonId>/attempt  -> start a round, or resume the open one. Body { resume: true } = resume
//        only (never draws). Returns the exam payload: ONLY the locked questions of the caller's round, in the locked
//        order, without answer / explanation / topic, plus the student's saved answers.
// A round past its deadline is never extended: any access ends it as 'expired' and scores it (settleAttempt, shared with
// the answer / submit routes under /api/tutor/attempts/<id>/).

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });
const RECENT_ROUNDS = 3; // "recently seen" = questions of the student's last 3 rounds on this lesson
const ATTEMPT_COLUMNS = "id, lesson_id, question_ids, total, started_at, deadline_at, status";

// -> { error: Response } | { db, studentId, lesson }
async function gate(req, params) {
  const caller = await tutorCaller(req);
  if (caller.error) return { error: caller.error };
  const { id } = await params;
  const { db, studentId } = caller;
  const { data: lesson, error } = await db
    .from("lessons")
    .select("id, course_id, status, tutor_draw_count")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  // students: active lessons only (same as lessons_select); staff may preview drafts
  if (!lesson || (lesson.status !== "active" && !caller.staff)) return { error: tutorNotFound() };
  const course = await loadTutorCourse(db, lesson.course_id);
  if (!course || !(await caller.canOpen(course))) return { error: tutorNotFound() };
  return { db, studentId, lesson };
}

async function loadOpenAttempt(db, studentId, lessonId) {
  const { data, error } = await db
    .from("tutor_attempts")
    .select(ATTEMPT_COLUMNS)
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .eq("status", "in_progress")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function loadBank(db, lessonId) {
  const { data, error } = await db.from("questions").select("id, topic_id").eq("lesson_id", lessonId).eq("kind", "tutor");
  if (error) throw error;
  return data || [];
}

async function loadRecentIds(db, studentId, lessonId) {
  const { data, error } = await db
    .from("tutor_attempts")
    .select("question_ids")
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId)
    .order("started_at", { ascending: false })
    .limit(RECENT_ROUNDS);
  if (error) throw error;
  return (data || []).flatMap((a) => a.question_ids);
}

async function examPayload(db, attempt, resumed) {
  const [{ data: rows, error: qErr }, { data: saved, error: aErr }] = await Promise.all([
    // explicit columns: never the answer key, the explanation or the topic
    db.from("questions").select("id, type, text, choices").in("id", attempt.question_ids).eq("lesson_id", attempt.lesson_id).eq("kind", "tutor"),
    db.from("tutor_answers").select("question_id, chosen").eq("attempt_id", attempt.id),
  ]);
  if (qErr) throw qErr;
  if (aErr) throw aErr;
  const byId = new Map((rows || []).map((q) => [q.id, q]));
  const questions = attempt.question_ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((q) => ({ id: q.id, type: q.type, text: q.text, choices: (q.choices || []).map((c) => ({ id: c.id, text: c.text })) }));
  const inAttempt = new Set(questions.map((q) => q.id));
  const answers = Object.fromEntries((saved || []).filter((a) => inAttempt.has(a.question_id)).map((a) => [a.question_id, a.chosen]));
  return {
    serverNow: new Date().toISOString(),
    attempt: {
      id: attempt.id,
      startedAt: attempt.started_at,
      deadlineAt: attempt.deadline_at,
      count: attempt.total,
      minutes: minutesFor(attempt.total),
      resumed,
    },
    questions,
    answers,
  };
}

export async function GET(req, { params }) {
  try {
    const g = await gate(req, params);
    if (g.error) return g.error;
    const { db, studentId, lesson } = g;
    const [bank, found] = await Promise.all([loadBank(db, lesson.id), loadOpenAttempt(db, studentId, lesson.id)]);
    const count = roundSize(bank.length, lesson.tutor_draw_count);
    const now = Date.now();
    const open = found && (await settleAttempt(db, found, now)); // any access past the deadline ends and scores the round
    return json({
      serverNow: new Date(now).toISOString(),
      count,
      minutes: minutesFor(count),
      attempt: open && { id: open.id, count: open.total, deadlineAt: open.deadline_at, expired: open.status !== "in_progress" },
    });
  } catch (e) {
    console.error("Tutor attempt preview failed:", e?.message || e);
    return json({ error: "Failed to load tutor attempt" }, 500);
  }
}

export async function POST(req, { params }) {
  try {
    const g = await gate(req, params);
    if (g.error) return g.error;
    const { db, studentId, lesson } = g;
    const body = await req.json().catch(() => ({}));
    const resumeOnly = body?.resume === true;
    const nowMs = Date.now();

    let attempt = await loadOpenAttempt(db, studentId, lesson.id);
    let resumed = !!attempt;
    if (attempt && isPastDeadline(attempt.deadline_at, nowMs)) {
      await settleAttempt(db, attempt, nowMs);
      attempt = null;
      resumed = false;
      if (resumeOnly) return json({ error: "Attempt expired", state: "expired" }, 409);
    }
    if (!attempt && resumeOnly) return json({ error: "No attempt in progress", state: "none" }, 409);

    if (!attempt) {
      const [bank, recent] = await Promise.all([loadBank(db, lesson.id), loadRecentIds(db, studentId, lesson.id)]);
      if (bank.length === 0) return json({ error: "No questions", state: "empty" }, 409);
      const ids = drawQuestions({ bank, count: lesson.tutor_draw_count, recent });
      const { data, error } = await db
        .from("tutor_attempts")
        .insert({
          student_id: studentId,
          lesson_id: lesson.id,
          question_ids: ids,
          total: ids.length,
          started_at: new Date(nowMs).toISOString(),
          deadline_at: deadlineFor(nowMs, ids.length), // server clock, 1 minute per question
        })
        .select(ATTEMPT_COLUMNS)
        .single();
      if (error?.code === "23505") {
        // two starts raced (one open round per student+lesson): hand back the winner's round
        attempt = await loadOpenAttempt(db, studentId, lesson.id);
        resumed = true;
        if (!attempt) throw error;
      } else if (error) {
        throw error;
      } else {
        attempt = data;
      }
    }
    const payload = await examPayload(db, attempt, resumed);
    // every locked question was deleted / retyped mid-round: nothing to show (the round stays open until its deadline)
    if (payload.questions.length === 0) return json({ error: "No questions", state: "empty" }, 409);
    return json(payload);
  } catch (e) {
    console.error("Tutor attempt start failed:", e?.message || e);
    return json({ error: "Failed to start tutor attempt" }, 500);
  }
}
