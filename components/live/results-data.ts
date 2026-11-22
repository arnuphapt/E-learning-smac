export interface ResultSession {
  title: string;
  created_at: string | null;
  ended_at: string | null;
  team_mode: boolean;
  total: number;
}

export interface ResultPlayer {
  userId: string;
  name: string;
  team: string | null;
  score: number;
  correct: number;
  rank: number;
}

export interface ResultTeam {
  name: string;
  colorNo: number;
  score: number;
  members: number;
  rank: number;
}

export interface ResultQuestion {
  idx: number;
  text: string;
  correctPct: number;
  answered: number;
}

export interface LiveResultsData {
  session?: ResultSession;
  players?: ResultPlayer[];
  teams?: ResultTeam[];
  questions?: ResultQuestion[];
}

export function formatResultDate(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  try {
    return new Date(isoStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export async function exportResultsExcel(data: LiveResultsData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // 1. Sheet รายคน
  const playerRows = (data.players || []).map((p) => {
    const row: Record<string, string | number> = {
      "อันดับ": p.rank,
      "ชื่อผู้เล่น": p.name,
    };
    if (data.session?.team_mode) {
      row["ทีม"] = p.team || "-";
    }
    row["คะแนน"] = p.score;
    row["ตอบถูก (ข้อ)"] = p.correct;
    row["จำนวนข้อทั้งหมด"] = data.session?.total || 0;
    return row;
  });
  const wsPlayers = XLSX.utils.json_to_sheet(playerRows);
  XLSX.utils.book_append_sheet(wb, wsPlayers, "รายคน");

  // 2. Sheet รายทีม (if team_mode)
  if (data.session?.team_mode && data.teams && data.teams.length > 0) {
    const teamRows = data.teams.map((t) => ({
      "อันดับ": t.rank,
      "ชื่อทีม": t.name,
      "คะแนนเฉลี่ย": t.score,
      "จำนวนสมาชิก": t.members,
    }));
    const wsTeams = XLSX.utils.json_to_sheet(teamRows);
    XLSX.utils.book_append_sheet(wb, wsTeams, "รายทีม");
  }

  // 3. Sheet รายข้อ
  const questionRows = (data.questions || []).map((q) => ({
    "ข้อที่": q.idx + 1,
    "คำถาม": q.text,
    "ความถูกต้อง (%)": `${q.correctPct}%`,
    "จำนวนคนตอบ": q.answered,
  }));
  const wsQuestions = XLSX.utils.json_to_sheet(questionRows);
  XLSX.utils.book_append_sheet(wb, wsQuestions, "รายข้อ");

  const safeTitle = (data.session?.title || "ผลควิซสด").replace(/[\\/:*?"<>|]/g, "_");
  XLSX.writeFile(wb, `ผลการแข่งขัน_${safeTitle}.xlsx`);
}
