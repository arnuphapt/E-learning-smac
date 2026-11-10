"use client";

import { useState, useEffect } from "react";

export default function StudentQuizHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function loadHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/live/history");
        if (!res.ok) {
          throw new Error("ไม่สามารถโหลดประวัติการเล่นควิซสดได้");
        }
        const data = await res.json();
        if (!ignore) {
          setHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "เกิดข้อผิดพลาด");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadHistory();
    return () => {
      ignore = true;
    };
  }, []);

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
    <section className="w-full mt-8 pt-6 border-t">
      <div className="flex items-center justify-between mb-4">
        <h2 className="t-lg fw-7 fg tight">
          ประวัติควิซสดของฉัน
        </h2>
        {history.length > 0 && (
          <span className="t-xs muted">
            ทั้งหมด {history.length} ครั้ง
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex col gap-3">
          <div className="skel h-14 rounded" />
          <div className="skel h-14 rounded" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="card card-p t-sm c-danger"
          style={{ background: "var(--danger-soft)", borderColor: "rgba(187,58,74,.22)" }}
        >
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="card empty">
          <div className="ec">
            <span style={{ fontSize: 24 }}>📜</span>
          </div>
          <div className="t-base fw-6 fg">ยังไม่มีประวัติการเล่นควิซสด</div>
          <p className="t-xs muted mt-1" style={{ margin: 0 }}>
            เมื่อจบเกมควิซสดในห้องเรียน ประวัติและคะแนนจะปรากฏที่นี่
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table hover">
              <thead>
                <tr>
                  <th scope="col">
                    ชื่อห้อง / ควิซ
                  </th>
                  <th scope="col">
                    วันที่เล่น
                  </th>
                  <th scope="col" style={{ textAlign: "center" }}>
                    อันดับ
                  </th>
                  <th scope="col" style={{ textAlign: "right" }}>
                    คะแนนที่ได้
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td data-label="ชื่อห้อง / ควิซ" className="fw-6 fg">
                      <div>{item.title}</div>
                      {item.team && (
                        <span className="badge badge-muted mt-1" style={{ height: 20, fontSize: 11, padding: "0 6px" }}>
                          ทีม: {item.team}
                        </span>
                      )}
                    </td>
                    <td data-label="วันที่เล่น" className="muted t-xs num">
                      {formatDate(item.endedAt)}
                    </td>
                    <td data-label="อันดับ" style={{ textAlign: "center" }}>
                      <span className="badge badge-muted" style={{ height: 22, fontSize: 11.5 }}>
                        อันดับ {item.rank} / {item.playerCount} คน
                      </span>
                    </td>
                    <td data-label="คะแนนที่ได้" style={{ textAlign: "right" }} className="num fw-7 fg">
                      {item.score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
