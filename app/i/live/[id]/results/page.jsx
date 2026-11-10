"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

export default function LiveQuizResultsPage() {
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("players"); // "players" | "teams" | "questions"

  useEffect(() => {
    if (!id) return;

    let ignore = false;
    async function fetchResults() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/live/${id}/results`);
        if (!res.ok) {
          if (res.status === 409) {
            throw new Error("ห้องนี้ยังไม่สิ้นสุดการแข่งขัน ไม่สามารถดูผลสรุปได้");
          }
          if (res.status === 403) {
            throw new Error("คุณไม่มีสิทธิ์เข้าถึงผลการแข่งขันของห้องนี้ (เฉพาะผู้สร้างห้องหรือผู้สอน)");
          }
          if (res.status === 404) {
            throw new Error("ไม่พบห้องควิซนี้ในระบบ");
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `เกิดข้อผิดพลาด (${res.status})`);
        }
        const json = await res.json();
        if (!ignore) {
          setData(json);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "ไม่สามารถโหลดข้อมูลผลการแข่งขันได้");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchResults();
    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleExportExcel() {
    if (!data) return;

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // 1. Sheet รายคน
    const playerRows = (data.players || []).map((p) => {
      const row = {
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

    // Export file
    const safeTitle = (data.session?.title || "ผลควิซสด").replace(/[\\/:*?"<>|]/g, "_");
    const filename = `ผลการแข่งขัน_${safeTitle}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  if (loading) {
    return (
      <div className="container py-10">
        <div className="text-center t-sm muted">
          <Icon name="loader" size={28} className="spin mxauto mb-3" />
          <div>กำลังโหลดข้อมูลผลการแข่งขัน…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10">
        <div className="card card-p mxauto text-center" style={{ maxWidth: 520 }}>
          <div
            className="ec mxauto mb-3"
            style={{
              background: "var(--danger-soft)",
              color: "var(--danger)",
              width: 48,
              height: 48,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="alert" size={24} />
          </div>
          <h1 className="t-lg fw-7 fg mb-2">ไม่สามารถแสดงผลการแข่งขันได้</h1>
          <p className="t-sm muted mb-5">{error}</p>
          <div className="flex justify-center">
            <Link
              href="/i/live"
              className="btn btn-outline"
            >
              <Icon name="arrL" size={14} />
              <span>กลับหน้ารายการห้อง</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { session, players = [], teams = [], questions = [] } = data || {};
  const isTeamMode = !!session?.team_mode;

  const formatDate = (isoStr) => {
    if (!isoStr) return "-";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="container">
      <div className="flex col gap-6">
        {/* Navigation & Header */}
        <div className="flex wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/i/live"
              className="iflex items-center gap-1.5 t-sm muted mb-2 pointer hover:fg transition"
            >
              <Icon name="arrL" size={14} />
              <span>กลับหน้ารายการห้อง</span>
            </Link>
            <h1 className="t-2xl fw-7 fg mb-1">
              {session?.title || "ผลการแข่งขันควิซสด"}
            </h1>
            <div className="flex wrap items-center gap-3 t-xs muted mt-1">
              <span>จบเมื่อ: {formatDate(session?.ended_at)}</span>
              <span className="dot-sep" />
              <span>จำนวน {session?.total || 0} ข้อ</span>
              <span className="dot-sep" />
              <span>
                โหมด: {isTeamMode ? "แบบทีม" : "แบบเดี่ยว"}
              </span>
              <span className="dot-sep" />
              <span>ผู้เล่น {players.length} คน</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportExcel}
              className="btn btn-outline"
            >
              <Icon name="excel" size={16} />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>

        {/* Accessible Tabs */}
        <div>
          <nav
            role="tablist"
            aria-label="แท็บดูผลคะแนน"
            className="tabs overflow-x-auto"
          >
            <button
              type="button"
              role="tab"
              id="tab-players"
              aria-selected={activeTab === "players"}
              aria-controls="panel-players"
              onClick={() => setActiveTab("players")}
              className={activeTab === "players" ? "on" : ""}
            >
              รายคน ({players.length})
            </button>

            {isTeamMode && (
              <button
                type="button"
                role="tab"
                id="tab-teams"
                aria-selected={activeTab === "teams"}
                aria-controls="panel-teams"
                onClick={() => setActiveTab("teams")}
                className={activeTab === "teams" ? "on" : ""}
              >
                รายทีม ({teams.length})
              </button>
            )}

            <button
              type="button"
              role="tab"
              id="tab-questions"
              aria-selected={activeTab === "questions"}
              aria-controls="panel-questions"
              onClick={() => setActiveTab("questions")}
              className={activeTab === "questions" ? "on" : ""}
            >
              รายข้อ ({questions.length})
            </button>
          </nav>
        </div>

        {/* Tab 1: รายคน */}
        {activeTab === "players" && (
          <div
            role="tabpanel"
            id="panel-players"
            aria-labelledby="tab-players"
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="table hover">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 64, textAlign: "center" }}>
                      อันดับ
                    </th>
                    <th scope="col">
                      ชื่อผู้เล่น
                    </th>
                    {isTeamMode && (
                      <th scope="col">
                        ทีม
                      </th>
                    )}
                    <th scope="col" style={{ textAlign: "right" }}>
                      ตอบถูก
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      คะแนนรวม
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {players.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isTeamMode ? 5 : 4}
                        className="center muted py-10"
                      >
                        ไม่มีผู้เล่นในห้องนี้
                      </td>
                    </tr>
                  ) : (
                    players.map((p) => {
                      const isTop3 = p.rank <= 3;
                      const badgeClass =
                        p.rank === 1
                          ? "badge-warning"
                          : p.rank === 2
                          ? "badge-outline"
                          : p.rank === 3
                          ? "badge-warning"
                          : "";

                      return (
                        <tr key={p.userId}>
                          <td style={{ textAlign: "center" }}>
                            {isTop3 ? (
                              <span
                                className={`badge ${badgeClass}`}
                                style={{ minWidth: 26, height: 26, padding: "0 6px", justifyContent: "center" }}
                              >
                                {p.rank}
                              </span>
                            ) : (
                              <span className="mono t-xs muted">
                                {p.rank}
                              </span>
                            )}
                          </td>
                          <td className="fw-6 fg">
                            {p.name}
                          </td>
                          {isTeamMode && (
                            <td className="muted">
                              {p.team || "-"}
                            </td>
                          )}
                          <td className="right num muted">
                            {p.correct} / {session?.total || 0} ข้อ
                          </td>
                          <td className="right num fw-7 fg">
                            {p.score.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: รายทีม (only in team_mode) */}
        {isTeamMode && activeTab === "teams" && (
          <div
            role="tabpanel"
            id="panel-teams"
            aria-labelledby="tab-teams"
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="table hover">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 64, textAlign: "center" }}>
                      อันดับ
                    </th>
                    <th scope="col">
                      ชื่อทีม
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      จำนวนสมาชิก
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      คะแนนเฉลี่ย
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="center muted py-10">
                        ไม่มีข้อมูลคะแนนทีม
                      </td>
                    </tr>
                  ) : (
                    teams.map((t, idx) => (
                      <tr key={t.name + idx}>
                        <td style={{ textAlign: "center" }}>
                          {t.rank === 1 ? (
                            <span
                              className="badge badge-warning"
                              style={{ minWidth: 26, height: 26, padding: "0 6px", justifyContent: "center" }}
                            >
                              {t.rank}
                            </span>
                          ) : (
                            <span className="mono t-xs muted">
                              {t.rank}
                            </span>
                          )}
                        </td>
                        <td className="fw-6 fg">
                          {t.name}
                        </td>
                        <td className="right num muted">
                          {t.members} คน
                        </td>
                        <td className="right num fw-7 fg">
                          {t.score.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: รายข้อ */}
        {activeTab === "questions" && (
          <div
            role="tabpanel"
            id="panel-questions"
            aria-labelledby="tab-questions"
            className="card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="table hover">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 64, textAlign: "center" }}>
                      ข้อที่
                    </th>
                    <th scope="col">
                      คำถาม
                    </th>
                    <th scope="col" style={{ width: 140, textAlign: "center" }}>
                      ความถูกต้อง (%)
                    </th>
                    <th scope="col" style={{ width: 120, textAlign: "right" }}>
                      ตอบแล้ว
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="center muted py-10">
                        ไม่มีคำถามในห้องนี้
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => {
                      const badgeClass =
                        q.correctPct >= 70
                          ? "badge-success"
                          : q.correctPct >= 40
                          ? "badge-warning"
                          : "badge-danger";

                      return (
                        <tr key={q.idx}>
                          <td style={{ textAlign: "center" }} className="mono t-xs muted">
                            {q.idx + 1}
                          </td>
                          <td className="fw-5 fg">
                            {q.text}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className={`badge ${badgeClass}`}>
                              {q.correctPct}%
                            </span>
                          </td>
                          <td className="right num muted">
                            {q.answered} คน
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
