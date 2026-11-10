import { isStaffRole, hasRole } from "@/lib/roles";
import { json, getLiveCaller } from "@/lib/live-server";

export async function PATCH(req, props) {
  try {
    const params = await props.params;
    const teamId = params?.teamId;
    if (!teamId) {
      return json({ error: "teamId is required" }, 400);
    }

    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    if (!isStaffRole(dbUser.role)) {
      return json({ error: "Forbidden: staff only" }, 403);
    }

    const body = await req.json().catch(() => null);
    const rawName = body?.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";

    if (!name || name.length < 1 || name.length > 30) {
      return json({ error: "ชื่อทีมต้องมีความยาว 1-30 ตัวอักษร" }, 400);
    }

    // Look up team to verify existence and get course_id
    const { data: team, error: tErr } = await db
      .from("live_teams")
      .select("id, course_id, color_no, name")
      .eq("id", teamId)
      .maybeSingle();
    if (tErr) throw tErr;

    if (!team) {
      return json({ error: "ไม่พบทีม" }, 404);
    }

    // Verify caller teaches the course or is admin
    const isAdmin = hasRole(dbUser.role, "admin");
    if (!isAdmin) {
      const { data: ciRow, error: ciErr } = await db
        .from("course_instructors")
        .select("user_id")
        .eq("course_id", team.course_id)
        .eq("user_id", callerId)
        .maybeSingle();
      if (ciErr) throw ciErr;

      if (!ciRow) {
        return json({ error: "Forbidden: caller does not teach this course" }, 403);
      }
    }

    const { data: updated, error: uErr } = await db
      .from("live_teams")
      .update({ name })
      .eq("id", teamId)
      .select("id, course_id, color_no, name")
      .single();
    if (uErr) throw uErr;

    return json({ team: updated });
  } catch (err) {
    console.error("PATCH /api/live/teams/[teamId] error:", err);
    return json({ error: "Internal Server Error" }, 500);
  }
}
