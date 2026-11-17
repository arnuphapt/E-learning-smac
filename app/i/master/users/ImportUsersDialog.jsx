"use client";

import React, { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog } from "@/components/ui/Primitives";
import { toast } from "@/components/ui/Toast";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loadXlsx = async () => {
  const m = await import("xlsx");
  return m.utils ? m : m.default;
};

const cell = (v) => String(v ?? "").trim();

export async function buildUserImportTemplateWorkbook(rolesList = [], sectionsList = []) {
  const XLSX = await loadXlsx();
  const studentRole = (rolesList || []).find((r) => cell(r.id).toLowerCase() === "student");
  const exampleRole = studentRole ? (cell(studentRole.name) || cell(studentRole.id)) : "";
  const firstSection = (sectionsList || []).find((s) => cell(s.name) !== "");
  const exampleSection = firstSection ? cell(firstSection.name) : "";

  const wsUsers = XLSX.utils.aoa_to_sheet([
    ["ชื่อ", "อีเมล", "บทบาท", "section"],
    ["นางสาวตัวอย่าง ใจดี", "example.name@smnc.ac.th", exampleRole, exampleSection],
  ]);
  wsUsers["!cols"] = [{ wch: 28 }, { wch: 30 }, { wch: 18 }, { wch: 24 }];

  const roleNames = (rolesList || []).map((r) => cell(r.name) || cell(r.id)).filter(Boolean);
  const sectionNames = (sectionsList || []).map((s) => cell(s.name)).filter(Boolean);
  const refRows = [["บทบาท (role)", "section"]];
  const maxLen = Math.max(roleNames.length, sectionNames.length);
  for (let i = 0; i < maxLen; i += 1) {
    refRows.push([roleNames[i] || "", sectionNames[i] || ""]);
  }
  const wsValid = XLSX.utils.aoa_to_sheet(refRows);
  wsValid["!cols"] = [{ wch: 28 }, { wch: 28 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsUsers, "users");
  XLSX.utils.book_append_sheet(wb, wsValid, "ค่าที่ใช้ได้");
  return { XLSX, wb };
}

async function downloadTemplate(rolesList, sectionsList) {
  const { XLSX, wb } = await buildUserImportTemplateWorkbook(rolesList, sectionsList);
  XLSX.writeFile(wb, "users-import-template.xlsx");
}
const normalizeHeader = (v) => cell(v).toLowerCase().replace(/\s+/g, " ");

const HEADER_ALIASES = {
  name: ["name", "ชื่อ", "ชื่อ-นามสกุล"],
  email: ["email", "อีเมล"],
  role: ["role", "บทบาท"],
  section: ["section"],
};

function resolveRole(rawRole, rolesList) {
  const trimmed = cell(rawRole);
  if (!trimmed) return { role: "student", error: null };

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { role: "student", error: null };

  const resolved = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    const match = (rolesList || []).find(
      (r) =>
        String(r.id || "").trim().toLowerCase() === lower ||
        String(r.name || "").trim().toLowerCase() === lower
    );
    if (!match) {
      return { role: null, error: `ไม่พบบทบาท "${part}"` };
    }
    if (!resolved.includes(match.id)) {
      resolved.push(match.id);
    }
  }
  return { role: resolved.join(","), error: null };
}

export function parseUserImportRows(rows, { firstRow = 1, rolesList = [], sectionsList = [], existingUsers = [] } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { parsedRows: [], fileError: "ไม่พบข้อมูลในไฟล์" };
  }

  const headers = (rows[0] || []).map(normalizeHeader);
  const colIndex = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    colIndex[key] = headers.findIndex((h) => aliases.includes(h));
  }

  const missing = [];
  if (colIndex.name < 0) missing.push("name/ชื่อ");
  if (colIndex.email < 0) missing.push("email/อีเมล");
  if (missing.length > 0) {
    return {
      parsedRows: [],
      fileError: `ไม่พบคอลัมน์ ${missing.join(", ")} ในแถวหัวตาราง (แถวที่ ${firstRow})`,
    };
  }

  const body = [];
  rows.slice(1).forEach((r, i) => {
    if ((r || []).some((c) => cell(c) !== "")) {
      body.push({ r, rowNum: firstRow + 1 + i });
    }
  });

  if (body.length === 0) {
    return { parsedRows: [], fileError: "ไม่พบข้อมูลผู้ใช้ในไฟล์ (มีแต่แถวหัวตาราง)" };
  }

  const existingByEmail = new Map();
  for (const u of existingUsers || []) {
    const em = cell(u.email).toLowerCase();
    if (em) existingByEmail.set(em, u);
  }

  const seenEmails = new Map();
  const parsedRows = body.map(({ r, rowNum }) => {
    const get = (k) => (colIndex[k] < 0 ? "" : cell(r[colIndex[k]]));

    const name = get("name");
    const email = get("email").toLowerCase();
    const rawRole = get("role");
    const rawSection = get("section");
    const reasons = [];

    if (!name) {
      reasons.push("กรุณาระบุชื่อ");
    }

    if (!email) {
      reasons.push("กรุณาระบุอีเมล");
    } else if (!EMAIL_RE.test(email)) {
      reasons.push("รูปแบบอีเมลไม่ถูกต้อง");
    } else if (seenEmails.has(email)) {
      reasons.push(`อีเมลซ้ำในไฟล์ (ซ้ำกับแถว ${seenEmails.get(email)})`);
    } else {
      seenEmails.set(email, rowNum);
    }

    const { role, error: roleError } = resolveRole(rawRole, rolesList);
    if (roleError) {
      reasons.push(roleError);
    }

    const isStudent = role ? role.split(",").includes("student") : false;
    let resolvedSection = rawSection;
    if (rawSection) {
      const secMatch = (sectionsList || []).find((s) => s.name === rawSection);
      if (!secMatch) {
        reasons.push(`ไม่พบ section "${rawSection}"`);
      } else {
        resolvedSection = secMatch.name;
      }
    } else if (role && isStudent) {
      reasons.push("กรุณาระบุ section สำหรับนักศึกษา");
    } else if (role) {
      resolvedSection = "ไม่มี";
    }

    const existing = email ? existingByEmail.get(email) : null;
    const localPart = email.includes("@") ? email.split("@")[0] : "";
    const studentNo = /^\d+$/.test(localPart) ? localPart : null;

    return {
      rowNum,
      name,
      email,
      rawRole,
      role: role || "",
      rawSection,
      section: resolvedSection,
      studentNo,
      existingId: existing ? existing.id : null,
      status: reasons.length === 0 ? "ok" : "error",
      reasons,
    };
  });

  return { parsedRows, fileError: null };
}

function makeUniqueUserId(index) {
  return `u_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
}

async function runInChunks(items, size, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

async function findUsersByEmails(emails) {
  const filters = emails.map((email) => {
    // Anchored, escaped regexes match literal emails without treating email characters as wildcards.
    const pattern = `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
    return `email.imatch.${JSON.stringify(pattern)}`;
  });
  const { data, error, count } = await supabase
    .from("users")
    .select("id, email", { count: "exact" })
    .or(filters.join(","))
    .range(0, emails.length - 1);

  if (error) return { data: [], error };
  // A capped response must not make an existing email look new.
  if (data.length !== count) {
    return { data: [], error: { message: "ตรวจสอบอีเมลได้ไม่ครบ กรุณาลดจำนวนแถวหรือแก้ไขอีเมลที่ซ้ำในระบบ" } };
  }
  return { data, error: null };
}

function updateImportedUser(row, id) {
  return supabase
    .from("users")
    .update({ name: row.name, role: row.role, section: row.section })
    .eq("id", id);
}

export default function ImportUsersDialog({ rolesList, sectionsList, existingUsers, onClose, onImported }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [rows, setRows] = useState([]);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);

  const close = () => {
    if (!saving) onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast("ไฟล์ใหญ่เกิน 5 MB", "error");
      return;
    }

    setReading(true);
    setSummary(null);
    setFileError("");
    setRows([]);
    setFileName(file.name);

    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws || !ws["!ref"]) {
        throw new Error("ไม่พบข้อมูลในชีทแรกของไฟล์");
      }
      const firstRow = XLSX.utils.decode_range(ws["!ref"]).s.r + 1;
      const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const { parsedRows, fileError: parseErr } = parseUserImportRows(sheetRows, {
        firstRow,
        rolesList,
        sectionsList,
        existingUsers,
      });

      if (parseErr) {
        setFileError(parseErr);
      } else {
        setRows(parsedRows);
      }
    } catch (err) {
      setFileError("อ่านไฟล์ไม่สำเร็จ: " + err.message);
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const okRows = rows.filter((r) => r.status === "ok");
  const errorRows = rows.filter((r) => r.status === "error");

  const handleConfirm = async () => {
    if (okRows.length === 0 || saving) return;
    setSaving(true);

    const { data: currentUsers, error: lookupError } = await findUsersByEmails(okRows.map((r) => r.email));
    if (lookupError) {
      setSaving(false);
      toast("ตรวจสอบผู้ใช้ก่อนนำเข้าไม่สำเร็จ: " + lookupError.message, "error");
      return;
    }
    const currentByEmail = new Map(currentUsers.map((u) => [cell(u.email).toLowerCase(), u.id]));
    const toInsert = okRows.filter((r) => !currentByEmail.has(r.email));
    const toUpdate = okRows.filter((r) => currentByEmail.has(r.email));

    let inserted = 0;
    let updated = 0;
    const saveErrors = [];

    if (toInsert.length > 0) {
      const insertPayloads = toInsert.map((r, idx) => ({
        rowNum: r.rowNum,
        email: r.email,
        payload: {
          id: makeUniqueUserId(idx),
          name: r.name,
          email: r.email,
          role: r.role,
          student_no: r.studentNo,
          section: r.section,
          group_id: null,
          study_year: null,
        },
      }));

      const { error: batchErr } = await supabase
        .from("users")
        .insert(insertPayloads.map((x) => x.payload));

      if (!batchErr) {
        inserted += insertPayloads.length;
      } else {
        const perRow = await runInChunks(insertPayloads, 10, async (item) => {
          // The failed batch may have raced a first sign-in; re-check before retrying any insert.
          const { data: matches, error: recheckError } = await findUsersByEmails([item.email]);
          if (recheckError) return { item, error: recheckError };
          if (matches.length > 0) {
            const { error } = await updateImportedUser(item.payload, matches[0].id);
            return { item, error, updated: true };
          }

          const { error: insertError } = await supabase.from("users").insert([item.payload]);
          if (insertError?.code !== "23505") return { item, error: insertError };

          const { data: conflictedUsers, error: conflictLookupError } = await findUsersByEmails([item.email]);
          if (conflictLookupError || conflictedUsers.length === 0) {
            return { item, error: conflictLookupError || insertError };
          }
          const { error } = await updateImportedUser(item.payload, conflictedUsers[0].id);
          return { item, error, updated: true };
        });
        for (const res of perRow) {
          if (res.error) {
            saveErrors.push(`แถว ${res.item.rowNum} (${res.item.email}): ${res.error.message}`);
          } else if (res.updated) {
            updated += 1;
          } else {
            inserted += 1;
          }
        }
      }
    }

    if (toUpdate.length > 0) {
      const updateResults = await runInChunks(toUpdate, 10, async (r) => {
        const { error } = await updateImportedUser(r, currentByEmail.get(r.email));
        return { r, error };
      });
      for (const res of updateResults) {
        if (res.error) {
          saveErrors.push(`แถว ${res.r.rowNum} (${res.r.email}): ${res.error.message}`);
        } else {
          updated += 1;
        }
      }
    }

    const totalErrors = errorRows.length + saveErrors.length;
    setSummary({ inserted, updated, errors: totalErrors, saveErrors });
    setSaving(false);

    await onImported();
    toast(
      `นำเข้าเสร็จสิ้น: เพิ่มใหม่ ${inserted}, อัปเดต ${updated}, ผิดพลาด ${totalErrors}`,
      saveErrors.length > 0 ? "warning" : "success"
    );
  };

  return (
    <Dialog
      title="นำเข้าผู้ใช้งานจาก Excel"
      desc="รองรับคอลัมน์ name/ชื่อ, email/อีเมล, role/บทบาท, section"
      onClose={close}
      lg
      footer={
        summary ? (
          <button className="btn btn-primary" onClick={close}>
            ปิด
          </button>
        ) : (
          <>
            <button className="btn btn-outline" onClick={close} disabled={saving}>
              ยกเลิก
            </button>
            {rows.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={saving || okRows.length === 0}
              >
                <Icon name="check" size={15} />
                {saving ? "กำลังนำเข้า…" : `ยืนยันนำเข้า (${okRows.length} รายการ)`}
              </button>
            )}
          </>
        )
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        hidden
        aria-label="เลือกไฟล์ Excel"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!summary && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <button
            className="btn btn-soft btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={saving || reading}
          >
            <Icon name="upload" size={15} />
            {reading ? "กำลังอ่านไฟล์…" : fileName ? "เลือกไฟล์อื่น" : "เลือกไฟล์ Excel (.xlsx / .xls)"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => downloadTemplate(rolesList, sectionsList).catch((e) => toast("สร้างไฟล์ตัวอย่างไม่สำเร็จ: " + e.message, "error"))}
            disabled={saving}
          >
            <Icon name="download" size={15} />ดาวน์โหลด template
          </button>
          {fileName && <span className="t-xs muted mono">{fileName}</span>}
        </div>
      )}

      {!fileName && !fileError && !summary && (
        <div className="t-sm muted pretty">
          <div className="mb-1"><b className="fg">คอลัมน์ที่รองรับ:</b> name / ชื่อ, email / อีเมล, role / บทบาท, section</div>
          <div className="mb-1">• <b className="fg">role:</b> ระบุรหัสหรือชื่อบทบาท (เว้นว่างจะเป็น student)</div>
          <div>• <b className="fg">section:</b> ต้องตรงกับชื่อ Section ในระบบทุกตัวอักษร (เว้นว่างได้เฉพาะที่ไม่ใช่ student)</div>
        </div>
      )}

      {fileError && (
        <div className="tw-imp-err mb-3" role="alert">
          {fileError}
        </div>
      )}

      {summary && (
        <div>
          <div className="p-3 mb-3" style={{ background: "var(--muted)", borderRadius: 10 }}>
            <div className="fw-6 mb-2">สรุปผลการนำเข้า</div>
            <div className="flex items-center gap-3 flex-wrap t-sm">
              <span>เพิ่มใหม่: <b className="c-success">{summary.inserted}</b></span>
              <span>อัปเดต: <b className="c-primary">{summary.updated}</b></span>
              <span>ผิดพลาด/ข้าม: <b className="c-danger">{summary.errors}</b></span>
            </div>
          </div>
          {summary.saveErrors.length > 0 && (
            <div className="tw-imp-err" role="alert">
              <div className="fw-6 mb-1">รายการที่บันทึกไม่สำเร็จ</div>
              <ul>
                {summary.saveErrors.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!summary && rows.length > 0 && (
        <>
          <div className="flex items-center gap-3 flex-wrap t-sm mb-3">
            <span>ทั้งหมด <b>{rows.length}</b> แถว</span>
            <span>พร้อมนำเข้า <b className="c-success">{okRows.length}</b> แถว</span>
            <span>ผิดพลาด <b className="c-danger">{errorRows.length}</b> แถว (จะไม่ถูกบันทึก)</span>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "auto", maxHeight: 380 }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>แถว</th>
                  <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>ชื่อ</th>
                  <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>อีเมล</th>
                  <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>บทบาท</th>
                  <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>Section</th>
                  <th style={{ padding: "10px 12px", fontSize: 12, textAlign: "left" }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowNum} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="tnum t-xs muted" style={{ padding: "10px 12px" }}>{r.rowNum}</td>
                    <td className="t-sm" style={{ padding: "10px 12px" }}>{r.name || <span className="muted">-</span>}</td>
                    <td className="t-sm muted" style={{ padding: "10px 12px" }}>{r.email || "-"}</td>
                    <td className="t-sm" style={{ padding: "10px 12px" }}>{r.role || r.rawRole || "-"}</td>
                    <td className="t-sm" style={{ padding: "10px 12px" }}>{r.section || r.rawSection || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {r.status === "ok" ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge tone="success">OK</Badge>
                          <span className="t-xs muted">{r.existingId ? "อัปเดต" : "เพิ่มใหม่"}</span>
                        </div>
                      ) : (
                        <div>
                          <Badge tone="danger">Error</Badge>
                          <div className="t-xs c-danger mt-1">{r.reasons.join(", ")}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Dialog>
  );
}
