import { json, getLiveCaller } from "@/lib/live-server";

export async function POST(req, { params }) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId } = caller;

    const { id } = await params;
    if (!id) return json({ error: "Session not found" }, 404);

    const body = await req.json().catch(() => null);
    const { question_idx, chosen } = body || {};

    if (
      typeof question_idx !== "number" ||
      !Number.isInteger(question_idx) ||
      question_idx < 0 ||
      typeof chosen !== "string" ||
      !chosen
    ) {
      return json({ error: "question_idx and chosen are required" }, 400);
    }

    const nowMs = Date.now();
    const { data: status, error } = await db.rpc("live_answer_submit", {
      p_session: id,
      p_user: callerId,
      p_idx: question_idx,
      p_chosen: chosen,
      p_now: new Date(nowMs).toISOString(),
    });
    if (error) throw error;
    if (status === "not_player") {
      return json({ error: "Forbidden: Caller is not a player of this session" }, 403);
    }
    if (status === "closed") {
      return json({ error: "ไม่อยู่ในช่วงตอบคำถามข้อนี้" }, 409);
    }
    if (status === "late") {
      return json({ error: "หมดเวลา" }, 409);
    }
    if (status === "invalid") {
      return json({ error: "Invalid choice" }, 400);
    }
    if (status === "duplicate") {
      return json({ error: "ตอบไปแล้ว" }, 409);
    }
    if (status !== "ok") throw new Error("Unexpected answer status");

    return json({ ok: true });
  } catch (e) {
    console.error("Live answer failed:", e?.message || e);
    return json({ error: "Failed to submit answer" }, 500);
  }
}
