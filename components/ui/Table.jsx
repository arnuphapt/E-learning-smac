"use client";
import React from "react";
import Loading from "./Loading";

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

function getHeaderText(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getHeaderText).join("");
  if (React.isValidElement(node)) return getHeaderText(node.props.children);
  return "";
}

function SortIcon({ direction }) {
  if (direction === "asc") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 6, display: "inline-block", verticalAlign: "middle" }}>
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 6, display: "inline-block", verticalAlign: "middle" }}>
        <path d="M12 5v14M5 12l7 7 7-7"/>
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 6, display: "inline-block", verticalAlign: "middle", opacity: 0.3 }}>
      <path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>
    </svg>
  );
}

function getSortValue(item, index, sortKeys, headers) {
  if (!item) return null;
  if (sortKeys && sortKeys[index] !== undefined) {
    const keyOrFunc = sortKeys[index];
    if (typeof keyOrFunc === "function") {
      return keyOrFunc(item);
    }
    if (typeof keyOrFunc === "string" && keyOrFunc) {
      return item[keyOrFunc];
    }
    return null;
  }
  
  const headerText = getHeaderText(headers[index]).toLowerCase().trim();
  if (!headerText) return null;
  
  let resolvedKey = null;
  if (headerText.includes("รหัส")) {
    resolvedKey = "student_no" in item ? "student_no" : "code" in item ? "code" : "username" in item ? "username" : "id";
  } else if (headerText.includes("ชื่อ") || headerText.includes("บทเรียน") || headerText.includes("หัวข้อ") || headerText.includes("รายการ")) {
    resolvedKey = "name" in item ? "name" : "title" in item ? "title" : "label" in item ? "label" : "username";
  } else if (headerText.includes("section") || headerText.includes("กลุ่มเรียน") || headerText.includes("ห้องเรียน")) {
    resolvedKey = "section" in item ? "section" : "name" in item ? "name" : "group_name";
  } else if (headerText.includes("สถานะ")) {
    resolvedKey = "status" in item ? "status" : "active";
  } else if (headerText.includes("ปี") || headerText.includes("ปีการศึกษา")) {
    resolvedKey = "year" in item ? "year" : "academic_year";
  } else if (headerText.includes("เทอม") || headerText.includes("ภาคเรียน")) {
    resolvedKey = "term";
  } else if (headerText.includes("จำนวน")) {
    resolvedKey = "students" in item ? "students" : "student_count" in item ? "student_count" : "count";
  } else if (headerText.includes("อีเมล")) {
    resolvedKey = "email";
  } else if (headerText.includes("กลุ่ม")) {
    resolvedKey = "group_name" in item ? "group_name" : "name";
  } else if (headerText.includes("บทบาท") || headerText.includes("สิทธิ์")) {
    resolvedKey = "role";
  } else if (headerText.includes("ลำดับ")) {
    resolvedKey = "index" in item ? "index" : "id";
  } else if (headerText.includes("คะแนน")) {
    resolvedKey = "score" in item ? "score" : "post" in item ? "post" : "pre";
  } else if (headerText.includes("ส่งงาน")) {
    resolvedKey = "status";
  }
  
  if (resolvedKey && resolvedKey in item) {
    return item[resolvedKey];
  }
  
  const keys = Object.keys(item);
  return item[keys[index]] || null;
}

function makeResponsiveRow(element, index, headers) {
  if (!React.isValidElement(element)) return element;

  if (element.type === React.Fragment) {
    const mappedChildren = React.Children.map(element.props.children, (child, idx) => {
      if (idx === 0) {
        return makeResponsiveRow(child, index, headers);
      } else {
        if (React.isValidElement(child) && child.type === "tr") {
          const trChildren = React.Children.map(child.props.children, td => {
            if (React.isValidElement(td) && td.type === "td" && td.props.colSpan != null) {
              return React.cloneElement(td, { colSpan: td.props.colSpan + 1 });
            }
            return td;
          });
          return React.cloneElement(child, {}, trChildren);
        }
        return child;
      }
    });
    return React.cloneElement(element, {}, mappedChildren);
  }

  if (element.type === "tr") {
    const originalChildren = element.props.children;
    const childrenArray = React.Children.toArray(originalChildren);
    
    const rowNumCell = (
      <td key="row-num" className="tnum" data-label="No." style={{ width: 55, textAlign: "center", color: "#64748b", fontWeight: 500, borderBottom: "1px solid #e2e8f0" }}>
        {index}
      </td>
    );
    
    const cellsWithLabels = childrenArray.map((td, i) => {
      if (!React.isValidElement(td) || td.type !== "td") return td;
      
      const headerObj = headers[i];
      const label = getHeaderText(headerObj);
      
      return React.cloneElement(td, {
        "data-label": label || undefined
      });
    });
    
    return React.cloneElement(element, {}, [rowNumCell, ...cellsWithLabels]);
  }

  return element;
}

export default function Table({
  headers = [],
  data = [],
  renderRow,
  colSpan,
  className = "table",
  pageSize = 10,
  emptyText = "ไม่มีข้อมูลแสดงในตาราง",
  filter,
  enableSearch = true,
  searchKeys = [],
  searchPlaceholder = "ค้นหาข้อมูล...",
  title,
  description,
  addButton,
  loading = false,
  sortKeys = [],
}) {
  const actualColSpan = (colSpan || headers.length || 1) + 1;
  const [page, setPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState({ keyIndex: null, direction: null });

  // Reset to page 1 whenever data, search query, or sorting changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [data.length, searchQuery, sortConfig]);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((key) => {
          const val = item[key];
          if (val == null) return false;
          return String(val).toLowerCase().includes(query);
        });
      }
      return Object.values(item).some((val) => {
        if (val == null) return false;
        if (typeof val === "object") return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchKeys]);

  const getSortValueLocal = (item, index) => {
    return getSortValue(item, index, sortKeys, headers);
  };

  const isColumnSortable = (index) => {
    if (sortKeys && sortKeys[index] !== undefined) {
      return sortKeys[index] !== null && sortKeys[index] !== false;
    }
    const headerText = getHeaderText(headers[index]).trim();
    if (!headerText) return false;
    if (["", "จัดการ", "ลบ", "เครื่องมือ", "action", "actions"].includes(headerText.toLowerCase())) {
      return false;
    }
    if (data.length > 0) {
      const sampleVal = getSortValueLocal(data[0], index);
      return sampleVal !== undefined && sampleVal !== null;
    }
    return true;
  };

  const sortedData = React.useMemo(() => {
    if (sortConfig.keyIndex === null) return filteredData;
    const index = sortConfig.keyIndex;
    const direction = sortConfig.direction;

    return [...filteredData].sort((a, b) => {
      let valA = getSortValueLocal(a, index);
      let valB = getSortValueLocal(b, index);

      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      const isNumA = typeof valA === "number" || (!isNaN(Number(valA)) && !isNaN(parseFloat(valA)));
      const isNumB = typeof valB === "number" || (!isNaN(Number(valB)) && !isNaN(parseFloat(valB)));

      if (isNumA && isNumB) {
        const numA = Number(valA);
        const numB = Number(valB);
        return direction === "asc" ? numA - numB : numB - numA;
      }

      const strA = String(valA).trim();
      const strB = String(valB).trim();

      return direction === "asc"
        ? strA.localeCompare(strB, "th", { sensitivity: "base" })
        : strB.localeCompare(strA, "th", { sensitivity: "base" });
    });
  }, [filteredData, sortConfig, sortKeys, headers]);

  const handleSort = (index) => {
    let direction = "asc";
    if (sortConfig.keyIndex === index) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }
    setSortConfig({ keyIndex: direction ? index : null, direction });
  };

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageData = sortedData.slice(start, start + pageSize);

  const hasPagination = sortedData.length > pageSize;

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

  const tableContent = (
    <div className="table-wrap" style={title ? { marginBottom: 0 } : undefined}>
      <style>{`
        .table-wrap {
          display: flex;
          flex-direction: column;
          width: 100%;
          overflow-x: auto;
          background: #fff;
          margin-bottom: 24px;
        }
        .card:has(.table-wrap) .card-h {
          border-bottom: none !important;
        }
        .table-filters {
          padding: 16px 20px !important;
          background: #fff !important;
          display: flex !important;
          gap: 16px !important;
          align-items: center !important;
          flex-wrap: wrap !important;
        }
        table.table {
          width: 100%;
          border-collapse: collapse !important;
          text-align: left;
        }
        table.table thead {
          background: #f8fafc !important;
        }
        table.table th {
          padding: 14px 20px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          color: #475569 !important;
          border-bottom: 1px solid #e2e8f0 !important;
          white-space: nowrap !important;
          text-transform: none !important;
          letter-spacing: normal !important;
        }
        table.table th.sortable {
          cursor: pointer !important;
          user-select: none !important;
          transition: background-color 0.15s ease, color 0.15s ease !important;
        }
        table.table th.sortable:hover {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
        }
        table.table td {
          padding: 16px 20px !important;
          font-size: 14px !important;
          color: #334155 !important;
          border-bottom: 1px solid #e2e8f0 !important;
          vertical-align: middle !important;
        }
        table.table tbody tr:last-child td {
          border-bottom: none !important;
        }
        table.table tbody tr {
          transition: background-color 0.15s ease !important;
        }
        table.table tbody tr:hover {
          background-color: #f8fafc !important;
        }
        table.table.hover tbody tr:hover {
          cursor: pointer !important;
        }
        .table-footer {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 14px 20px !important;
          border-top: 1px solid #e2e8f0 !important;
          background: #fff !important;
          gap: 12px !important;
          flex-wrap: wrap !important;
        }
        .table-count {
          font-size: 13px !important;
          color: #64748b !important;
        }
        .table-pagination {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
        }
        .pg-btn {
          height: 32px !important;
          min-width: 32px !important;
          padding: 0 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          color: #475569 !important;
          background: #fff !important;
          border: 1px solid #cbd5e1 !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
        }
        .pg-btn:hover:not(:disabled) {
          background: #f1f5f9 !important;
          color: #1e293b !important;
          border-color: #94a3b8 !important;
        }
        .pg-btn:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
        .pg-btn.pg-active {
          background: var(--primary, #0d6e8c) !important;
          color: #fff !important;
          border-color: var(--primary, #0d6e8c) !important;
        }
        .pg-ellipsis {
          font-size: 13px !important;
          color: #94a3b8 !important;
          padding: 0 4px !important;
        }

        /* === Mobile responsive table === */
        @media (max-width: 767px) {
          .table-wrap {
            overflow-x: unset;
          }
          .table-filters {
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          table.table thead {
            display: none !important;
          }
          table.table,
          table.table tbody,
          table.table tr,
          table.table td {
            display: block !important;
            width: 100% !important;
          }
          table.table tbody tr {
            border-bottom: 2px solid #e2e8f0 !important;
            padding: 12px 0 4px !important;
            background: #fff;
          }
          table.table tbody tr:last-child {
            border-bottom: none !important;
          }
          table.table tbody tr:hover {
            background-color: #f8fafc !important;
          }
          table.table td {
            padding: 6px 16px !important;
            border-bottom: none !important;
            font-size: 13.5px !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-height: 32px !important;
          }
          table.table td[data-label]::before {
            content: attr(data-label);
            font-size: 11px !important;
            font-weight: 600 !important;
            color: #94a3b8 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.4px !important;
            min-width: 90px !important;
            flex: 0 0 90px !important;
          }
          table.table td[data-label="No."] {
            display: none !important;
          }
          table.table td[data-label=""] {
            justify-content: flex-end !important;
            padding-right: 16px !important;
            padding-bottom: 10px !important;
          }
          table.table td[data-label=""]::before {
            display: none !important;
          }
          .table-footer {
            padding: 12px 16px !important;
            justify-content: center !important;
          }
          .table-count {
            display: none !important;
          }
        }
      `}</style>
      {loading ? (
        <Loading className="p-5 text-center muted" />
      ) : (
        <>
          {(enableSearch || filter) && (
            <div className="table-filters">
              {enableSearch && (
                <div style={{ position: "relative", display: "flex", alignItems: "center", flex: "1 1 auto", minWidth: 240 }}>
                  <span style={{ position: "absolute", left: 12, color: "#64748b", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="input"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      height: 38,
                      paddingLeft: 38,
                      paddingRight: 12,
                      fontSize: 13,
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      transition: "all 0.2s"
                    }}
                  />
                </div>
              )}
              {filter}
            </div>
          )}
          <table className={className}>
            <thead>
              <tr>
                <th style={{ width: 55, textAlign: "center" }}>No.</th>
                {headers.map((h, i) => {
                  const sortable = isColumnSortable(i);
                  const isCurrent = sortConfig.keyIndex === i;
                  return (
                    <th
                      key={i}
                      className={sortable ? "sortable" : undefined}
                      onClick={sortable ? () => handleSort(i) : undefined}
                      style={sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
                    >
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {h}
                        {sortable && <SortIcon direction={isCurrent ? sortConfig.direction : null} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={actualColSpan} style={{ textAlign: "center", padding: "36px 24px", color: "var(--subtle)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--muted)", display: "grid", placeItems: "center", color: "var(--subtle)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{emptyText}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pageData.map((row, i) => makeResponsiveRow(renderRow(row, start + i), start + i + 1, headers))
              )}
            </tbody>
          </table>

          {hasPagination && (
            <div className="table-footer">
              <span className="table-count">
                {start + 1}–{Math.min(start + pageSize, sortedData.length)} จาก {sortedData.length} รายการ
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
        </>
      )}
    </div>
  );

  if (title) {
    return (
      <div className="card">
        <div className="card-h flex items-center justify-between" style={{ borderBottom: "none" }}>
          <div>
            <div className="title">{title}</div>
            {description && <div className="desc pretty">{description}</div>}
          </div>
          {addButton}
        </div>
        {tableContent}
      </div>
    );
  }

  return tableContent;
}
