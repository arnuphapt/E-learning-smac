import { isStaffRole, hasRole } from "@/lib/roles";
import { validateQuiz, genPin, TEAM_NAMES } from "@/lib/live";
import { json, getLiveCaller, readLiveRows } from "@/lib/live-server";

export async function POST(req) {
  try {
    const caller = await getLiveCaller(req);
    if (caller.error) return caller.error;
    const { db, callerId, dbUser } = caller;

    if (!isStaffRole(dbUser.role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => null);
    const { quiz_id, course_id, restrict_to_course = true, team_mode, team_count } = body || {};

    if (!quiz_id || typeof quiz_id !== "string" || !course_id || typeof course_id !== "string") {
      return json({ error: "quiz_id and course_id are required" }, 400);
    }

    // Quiz must be owned by caller
    const { data: quiz, error: qErr } = await db
      .from("live_quizzes")
      .select("id, owner_id")
      .eq("id", quiz_id)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!quiz || quiz.owner_id !== callerId) {
      return json({ error: "Quiz not found or not owned by caller" }, 403);
    }

    // Caller must teach course_id (course_instructors) or be admin
    const isAdmin = hasRole(dbUser.role, "admin");
    if (!isAdmin) {
      const { data: ciRow, error: ciErr } = await db
        .from("course_instructors")
        .select("user_id")
        .eq("course_id", course_id)
        .eq("user_id", callerId)
        .maybeSingle();
      if (ciErr) throw ciErr;

      if (!ciRow) {
        return json({ error: "Caller does not teach this course" }, 403);
      }
    }

    // Load quiz questions and validate
    const { data: questions, error: questionsErr } = await readLiveRows(() => db
      .from("live_quiz_questions")
      .select("text, choices, answer, time_limit_sec")
      .eq("quiz_id", quiz_id)
      .order("no", { ascending: true }).order("id"));
    if (questionsErr) throw questionsErr;

    const validation = validateQuiz(questions || []);
    if (!validation.ok) {
      return json({ error: "ชุดควิซไม่พร้อมใช้งาน", problems: validation.problems }, 422);
    }

    let teamsCreated = false;
    if (team_mode) {
      const { data: existingTeams, error: tErr } = await db
        .from("live_teams")
        .select("id")
        .eq("course_id", course_id);
      if (tErr) throw tErr;

      if (!existingTeams || existingTeams.length === 0) {
        const count = Number(team_count);
        if (!Number.isInteger(count) || count < 2 || count > 8) {
          return json({ error: "team_count (2-8) is required when creating teams" }, 400);
        }

        const teamsToInsert = [];
        for (let i = 1; i <= count; i++) {
          teamsToInsert.push({
            course_id,
            color_no: i,
            name: TEAM_NAMES[i - 1],
          });
        }

        const { error: insErr } = await db.from("live_teams").insert(teamsToInsert);
        if (insErr) throw insErr;
        teamsCreated = true;
      }
    }

    // Generate PIN and create session via RPC (retry up to 5 times on unique collision)
    const MAX_RETRIES = 5;
    let sessionId = null;
    let pin = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const candidatePin = genPin();
      const { data, error } = await db.rpc("live_session_create", {
        p_host: callerId,
        p_quiz: quiz_id,
        p_course: course_id,
        p_pin: candidatePin,
        p_team_mode: Boolean(team_mode),
        p_restrict: restrict_to_course !== false,
      });

      if (!error) {
        sessionId = data;
        pin = candidatePin;
        break;
      }

      const isUniqueViolation =
        error.code === "23505" ||
        String(error.message || "").toLowerCase().includes("unique") ||
        String(error.message || "").includes("pin");

      if (isUniqueViolation && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }

    if (!sessionId) {
      return json({ error: "Failed to generate unique PIN" }, 500);
    }

    return json({ id: sessionId, pin, teamsCreated });
  } catch (e) {
    console.error("Live session create failed:", e?.message || e);
    return json({ error: "Failed to create live session" }, 500);
  }
}
