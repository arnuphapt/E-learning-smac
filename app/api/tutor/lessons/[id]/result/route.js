import { NextResponse } from "next/server";
import { tutorLessonGate, tutorNotFound, loadOwnAttempt, settleAttempt, ATTEMPT_END_COLUMNS } from "@/lib/tutor-server";
import { publicSummary } from "@/lib/tutor-ai";
import { pickBest } from "@/lib/tutor-analysis";

// Result of the caller's ENDED tutor attempts on ONE lesson. Identity = session; service role; the lesson lock is
// checked by tutorLessonGate. Only the caller's own attempts are ever read.
//   GET /api/tutor/lessons/<lessonId>/result                 -> the caller's BEST ended attempt (highest score / total, tie -> latest)
//   GET /api/tutor/lessons/<lessonId>/result?attempt=<uuid>  -> that specific attempt of the caller
//   200 { attempt, bestId, rounds, summary, analysis, review }   summary is null until POST /api/tutor/attempts/<id>/summary has stored it
//   409 { state: "in_progress" }  the attempt is still running: no key, no explanation, nothing (past its deadline it is
//                                 ended + scored here first)
//   409 { state: "none" }         no ended attempt yet (no ?attempt)
//   404                           not a tutor lesson the caller may open / not the caller's attempt: no existence oracle
// Everything about scoring comes from the `result` stored when the attempt ended (settleAttempt), never from live
// answers or question.topic_id, so score, analysis and review always agree. Only the question text / choices /
// explanation are read live; a question deleted (or no longer a tutor question) since shows as { deleted: true }.

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function GET(req, { params }) {
  try {
    const g = await tutorLessonGate(req, params);
    if (g.error) return g.error;
    const { db, studentId, lesson } = g;
    const nowMs = Date.now();
    const attemptId = new URL(req.url).searchParams.get("attempt");

    let target = null;
    if (attemptId) {
      target = await loadOwnAttempt(db, studentId, attemptId);
      if (!target || target.lesson_id !== lesson.id) return tutorNotFound();
      target = await settleAttempt(db, target, nowMs); // past its deadline -> ended + scored now
      if (target.status === "in_progress") return json({ state: "in_progress" }, 409);
    } else {
      // No ?attempt: a round of this lesson that ran past its deadline is ended + scored first, so it is among the rounds
      // (and can be the best one) even if its owner never came back to submit. A still-running round stays untouched.
      const { data: open, error: oErr } = await db
        .from("tutor_attempts")
        .select(ATTEMPT_END_COLUMNS)
        .eq("student_id", studentId)
        .eq("lesson_id", lesson.id)
        .eq("status", "in_progress");
      if (oErr) throw oErr;
      for (const a of open || []) await settleAttempt(db, a, nowMs);
    }

    // listed AFTER the settle above so a round that just ended is part of the rounds
    const { data: ended, error: lErr } = await db
      .from("tutor_attempts")
      .select("id, score, total, status, started_at, submitted_at")
      .eq("student_id", studentId)
      .eq("lesson_id", lesson.id)
      .neq("status", "in_progress")
      .not("score", "is", null)
      .order("started_at", { ascending: true });
    if (lErr) throw lErr;
    const rounds = (ended || []).map((a, i) => ({ id: a.id, number: i + 1, score: a.score, total: a.total, status: a.status, startedAt: a.started_at, submittedAt: a.submitted_at }));
    const best = pickBest((ended || []).map((a) => ({ id: a.id, score: a.score, total: a.total, started_at: a.started_at })));

    if (!target) {
      if (!best) return json({ state: "none" }, 409);
      const stored = await loadOwnAttempt(db, studentId, best.id);
      if (!stored) return tutorNotFound();
      target = await settleAttempt(db, stored, nowMs); // fills `result` of a round that ended before it existed
    }
    const result = target.result;
    if (!result) throw new Error("ended attempt without a stored result");

    const { data: live, error: qErr } = await db
      .from("questions")
      .select("id, type, text, choices, explanation")
      .in("id", result.rows.map((r) => r.question_id))
      .eq("lesson_id", lesson.id)
      .eq("kind", "tutor");
    if (qErr) throw qErr;
    const byId = new Map((live || []).map((q) => [q.id, q]));
    const review = result.rows.map((r, i) => {
      const q = byId.get(r.question_id);
      return {
        n: i + 1,
        questionId: r.question_id,
        deleted: !q,
        type: q?.type ?? null,
        text: q?.text ?? null,
        choices: q ? (q.choices || []).map((c) => ({ id: c.id, text: c.text })) : [],
        chosen: r.chosen,
        answer: r.answer,
        correct: r.correct,
        unanswered: r.unanswered, // "ไม่ได้ตอบ": reported apart from a wrong answer
        topic: r.topic,
        explanation: q?.explanation ?? null,
      };
    });

    return json({
      attempt: {
        id: target.id,
        number: rounds.find((x) => x.id === target.id)?.number ?? null,
        status: target.status,
        score: target.score,
        total: target.total,
        startedAt: target.started_at,
        submittedAt: target.submitted_at,
      },
      bestId: best?.id ?? null, // the round the page shows by default
      rounds,
      summary: publicSummary(target.summary), // ticket 06: AI summary stored on the attempt (generated by ./summary, never here)
      analysis: result.analysis,
      review,
    });
  } catch (e) {
    console.error("Tutor result failed:", e?.message || e);
    return json({ error: "Failed to load tutor result" }, 500);
  }
}
