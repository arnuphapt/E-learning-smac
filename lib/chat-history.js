// Student "clear chat history" = soft-hide. Rows are never deleted: /api/ai/chat counts them for the daily quota.
// studentId must come from the verified session. sessionId "legacy" = rows logged before sessions existed (session_id IS NULL).
export function hideSession(admin, studentId, sessionId) {
  let q = admin.from("ai_chat_logs").update({ hidden_by_student: true }).eq("student_id", studentId);
  q = sessionId === "legacy" ? q.is("session_id", null) : q.eq("session_id", sessionId);
  return q;
}
