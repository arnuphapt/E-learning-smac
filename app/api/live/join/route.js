import { isStaffRole } from "@/lib/roles";
import { canStudentAccessCourse } from "@/lib/course-access";
import { loadStudentContext } from "@/lib/file-access";
import { json, getLiveCaller } from "@/lib/live-server";

export async function POST(req) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser, token } = caller;

    const body = await req.json().catch(() => null);
    const rawPin = body?.pin;
    const pin =
      typeof rawPin === "string"
        ? rawPin.trim()
        : typeof rawPin === "number"
          ? String(rawPin).trim()
          : "";

    if (!/^\d{6}$/.test(pin)) {
      return json({ error: "PIN ต้องเป็นตัวเลข 6 หลัก" }, 400);
    }

    const { data: session, error: sErr } = await db
      .from("live_sessions")
      .select("id, course_id, restrict_to_course, phase, team_mode")
      .eq("pin", pin)
      .neq("phase", "ended")
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) {
      return json({ error: "ไม่พบห้อง" }, 404);
    }

    const staff = isStaffRole(dbUser.role);
    if (session.restrict_to_course && !staff) {
      const [{ data: course }, ctx] = await Promise.all([
        db
          .from("courses_all")
          .select("id, kind, section, year_level, access")
          .eq("id", session.course_id)
          .maybeSingle(),
        loadStudentContext(db, callerId, token.email || ""),
      ]);

      if (!ctx.ok || !course || !canStudentAccessCourse(course, ctx.student, ctx.sections, ctx.grades)) {
        return json({ error: "ห้องนี้เฉพาะนักศึกษาในรายวิชา" }, 403);
      }
    }

    const displayName = dbUser.name || "นักศึกษา";

    const { data: status, error: joinErr } = await db.rpc("live_join_session", {
      p_session: session.id,
      p_user: callerId,
      p_name: displayName,
    });
    if (joinErr) throw joinErr;
    if (status === "closed") {
      return json({ error: "ไม่พบห้อง" }, 404);
    }

    return json({ id: session.id });
  } catch (e) {
    console.error("Live join failed:", e?.message || e);
    return json({ error: "Failed to join live session" }, 500);
  }
}
