import React from "react";

export default function Table({ headers = [], data = [], renderRow, colSpan, className = "table" }) {
  const actualColSpan = colSpan || headers.length || 1;

  return (
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
            <td colSpan={actualColSpan} style={{ textAlign: "center", padding: "30px", color: "var(--subtle)" }}>
              ไม่มีข้อมูลแสดงในตาราง
            </td>
          </tr>
        ) : (
          data.map((row, i) => renderRow(row, i))
        )}
      </tbody>
    </table>
  );
}
