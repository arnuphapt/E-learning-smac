"use client";
import React from "react";

function ChevLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function Table({
  headers = [],
  data = [],
  renderRow,
  colSpan,
  className = "table",
  pageSize = 10,
  emptyText = "ไม่มีข้อมูลแสดงในตาราง",
}) {
  const actualColSpan = colSpan || headers.length || 1;
  const [page, setPage] = React.useState(1);

  // Reset to page 1 whenever data changes (e.g. after a search/filter)
  React.useEffect(() => { setPage(1); }, [data.length]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageData = data.slice(start, start + pageSize);

  const hasPagination = data.length > pageSize;

  // Build visible page numbers: always show first, last, current ±1
  function getPageNums() {
    const pages = new Set();
    pages.add(1);
    pages.add(totalPages);
    for (let i = safePage - 1; i <= safePage + 1; i++) {
      if (i >= 1 && i <= totalPages) pages.add(i);
    }
    const sorted = [...pages].sort((a, b) => a - b);
    // Insert ellipsis markers
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
      result.push(sorted[i]);
    }
    return result;
  }

  return (
    <div className="table-wrap">
      <table className={className}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={actualColSpan} style={{ textAlign: "center", padding: "36px 24px", color: "var(--subtle)" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--muted)", display: "grid", placeItems: "center", color: "var(--subtle)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="M9 12h6M9 16h4"/></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{emptyText}</span>
                </div>
              </td>
            </tr>
          ) : (
            pageData.map((row, i) => renderRow(row, start + i))
          )}
        </tbody>
      </table>

      {hasPagination && (
        <div className="table-footer">
          <span className="table-count">
            {start + 1}–{Math.min(start + pageSize, data.length)} จาก {data.length} รายการ
          </span>
          <div className="table-pagination">
            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="หน้าก่อนหน้า"
            >
              <ChevLeft />
            </button>

            {getPageNums().map((pg, i) =>
              pg === "…" ? (
                <span key={`e-${i}`} className="pg-ellipsis">…</span>
              ) : (
                <button
                  key={pg}
                  className={"pg-btn" + (pg === safePage ? " pg-active" : "")}
                  onClick={() => setPage(pg)}
                  aria-label={`หน้า ${pg}`}
                  aria-current={pg === safePage ? "page" : undefined}
                >
                  {pg}
                </button>
              )
            )}

            <button
              className="pg-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="หน้าถัดไป"
            >
              <ChevRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
