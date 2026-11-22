import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Student "clear chat history" = soft-hide. Rows are never deleted: /api/ai/chat counts them for the daily quota.
// studentId must come from the verified session. sessionId "legacy" = rows logged before sessions existed (session_id IS NULL).
export function hideSession(
  admin: SupabaseClient<Database>,
  studentId: string,
  sessionId: string
) {
  const q = admin.from("ai_chat_logs").update({ hidden_by_student: true }).eq("student_id", studentId);
  return sessionId === "legacy" ? q.is("session_id", null) : q.eq("session_id", sessionId);
}
