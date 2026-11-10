import { isStaffRole, hasRole } from "@/lib/roles";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";
import { canStudentAccessCourse } from "@/lib/course-access";
import { loadStudentContext } from "@/lib/file-access";

export async function GET(req) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser, token } = caller;

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("course_id");

    if (!courseId) {
      return json({ error: "course_id is required" }, 400);
    }

    const staff = isStaffRole(dbUser.role);
    const isAdmin = hasRole(dbUser.role, "admin");

    if (staff) {
      if (!isAdmin) {
        const { data: ciRow, error: ciErr } = await db
          .from("course_instructors")
          .select("user_id")
          .eq("course_id", courseId)
          .eq("user_id", callerId)
          .maybeSingle();
        if (ciErr) throw ciErr;

        if (!ciRow) {
          return json({ error: "Forbidden: caller does not teach this course" }, 403);
        }
      }
    } else {
      // Student: check if student can access the course
      const [{ data: course, error: cErr }, ctx] = await Promise.all([
        db
          .from("courses_all")
          .select("id, kind, section, year_level, access")
          .eq("id", courseId)
          .maybeSingle(),
        loadStudentContext(db, callerId, token?.email || ""),
      ]);
      if (cErr) throw cErr;

      if (!ctx.ok || !course || !canStudentAccessCourse(course, ctx.student, ctx.sections, ctx.grades)) {
        return json({ error: "Forbidden: student cannot access this course" }, 403);
      }
    }

    // Load teams for course
    const { data: teamsData, error: tErr } = await db
      .from("live_teams")
      .select("id, color_no, name, course_id")
      .eq("course_id", courseId)
      .order("color_no", { ascending: true });
    if (tErr) throw tErr;

    if (!teamsData || teamsData.length === 0) {
      return json({ teams: [], myTeamId: null });
    }

    const teamIds = teamsData.map((t) => t.id);

    // Load members
    const { data: membersData, error: mErr } = await readLiveRows(() => db
      .from("live_team_members")
      .select("team_id, user_id")
      .eq("course_id", courseId)
      .in("team_id", teamIds).order("user_id"));
    if (mErr) throw mErr;

    // Load member user display names
    const memberRows = membersData || [];
    const userIds = [...new Set(memberRows.map((m) => m.user_id))];
    let userMap = new Map();
    if (userIds.length > 0) {
      const { data: userRows, error: uErr } = await readLiveRows(() => db
        .from("users")
        .select("id, name")
        .in("id", userIds).order("id"));
      if (uErr) throw uErr;
      for (const u of userRows || []) {
        userMap.set(u.id, u.name || "นักศึกษา");
      }
    }

    // Build members per team map
    const teamMembersMap = new Map();
    let myTeamId = null;
    for (const m of memberRows) {
      if (m.user_id === callerId) {
        myTeamId = m.team_id;
      }
      if (!teamMembersMap.has(m.team_id)) {
        teamMembersMap.set(m.team_id, []);
      }
      teamMembersMap.get(m.team_id).push({
        userId: m.user_id,
        name: userMap.get(m.user_id) || "นักศึกษา",
      });
    }

    // Format teams response
    const teams = teamsData.map((t) => ({
      id: t.id,
      name: t.name,
      colorNo: t.color_no,
      members: teamMembersMap.get(t.id) || [],
    }));

    return json({ teams, myTeamId });
  } catch (err) {
    console.error("GET /api/live/teams error:", err);
    return json({ error: "Internal Server Error" }, 500);
  }
}
