import { type NextRequest } from "next/server";
import { isStaffRole } from "@/lib/roles";
import { canStudentAccessCourse, canStudentAccessHub } from "@/lib/course-access";
import { loadStudentContext } from "@/lib/file-access";
import { json, getLiveCaller } from "@/lib/live-server";

export async function POST(req: NextRequest) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser, token } = caller;

    const rawBody: unknown = await req.json().catch(() => null);
    const rawPin =
      rawBody && typeof rawBody === "object" && "pin" in rawBody
        ? (rawBody as { pin?: unknown }).pin
        : undefined;
    const pin =
      typeof rawPin === "string"
        ? rawPin.trim()
        : typeof rawPin === "number"
          ? String(rawPin).trim()
          : "";

    if (!/^\d{6}$/.test(pin)) {
      return json({ error: "PIN ต้องเป็นตัวเลข 6 หลัก" }, 400);
    }

    // Optional per-session display name; absent -> account name fallback below.
    const rawName =
      rawBody && typeof rawBody === "object" && "name" in rawBody
        ? (rawBody as { name?: unknown }).name
        : undefined;
    let customName: string | null = null;
    if (rawName !== undefined && rawName !== null) {
      customName = typeof rawName === "string" ? rawName.trim() : "";
      if (customName.length < 1 || customName.length > 30) {
        return json({ error: "ชื่อที่จะแสดงต้องมี 1-30 ตัวอักษร" }, 400);
      }
    }

    const { data: session, error: sErr } = await db
      .from("live_sessions")
      .select("id, course_id, hub_id, restrict_to_course, phase, team_mode")
      .eq("pin", pin)
      .neq("phase", "ended")
      .maybeSingle();
    if (sErr) throw sErr;
    if (!session) {
      return json({ error: "ไม่พบห้อง" }, 404);
    }

    const staff = isStaffRole(dbUser.role);
    if (!staff && (session.restrict_to_course || session.hub_id)) {
      const [ctx, courseRes, hubRes] = await Promise.all([
        loadStudentContext(db, callerId, token.email || ""),
        session.restrict_to_course
          ? db
              .from("courses_all")
              .select("id, kind, section, year_level, access")
              .eq("id", session.course_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        session.hub_id
          ? db
              .from("live_hubs")
              .select("id, year_level")
              .eq("id", session.hub_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (courseRes.error) throw courseRes.error;
      if (hubRes.error) throw hubRes.error;

      if (session.hub_id) {
        if (!ctx.ok || !hubRes.data || !canStudentAccessHub(hubRes.data.year_level, ctx.student, ctx.grades)) {
          return json({ error: "ห้องนี้เปิดเฉพาะชั้นปีที่กำหนดใน Hub" }, 403);
        }
      }

      if (session.restrict_to_course) {
        if (!ctx.ok || !courseRes.data || !canStudentAccessCourse(courseRes.data, ctx.student, ctx.sections, ctx.grades)) {
          return json({ error: "ห้องนี้เฉพาะนักศึกษาในรายวิชา" }, 403);
        }
      }
    }

    const displayName = customName ?? (dbUser.name || "นักศึกษา");

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
    console.error("Live join failed:", e instanceof Error ? e.message : e);
    return json({ error: "Failed to join live session" }, 500);
  }
}
