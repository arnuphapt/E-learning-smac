import { supabase } from "@/lib/supabase"

export interface RoleOption {
  id: string;
  name?: string | null;
}

export interface SectionOption {
  id?: string;
  name: string | null;
}

export interface ExistingUserOption {
  id: string;
  email: string | null;
}

export interface ParsedImportRow {
  rowNum: number;
  name: string;
  email: string;
  rawRole: string;
  role: string;
  rawSection: string;
  section: string;
  studentNo: string | null;
  existingId: string | null;
  status: "ok" | "error";
  reasons: string[];
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  errors: number;
  saveErrors: string[];
}


export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loadXlsx = async () => {
  const m = await import("xlsx");
  return m.utils ? m : (m as unknown as { default: typeof m }).default;
};

export const cell = (v: unknown): string => String(v ?? "").trim();

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return String(err);
}

export async function buildUserImportTemplateWorkbook(
  rolesList: RoleOption[] = [],
  sectionsList: SectionOption[] = []
) {
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

export async function downloadTemplate(rolesList: RoleOption[], sectionsList: SectionOption[]) {
  const { XLSX, wb } = await buildUserImportTemplateWorkbook(rolesList, sectionsList);
  XLSX.writeFile(wb, "users-import-template.xlsx");
}
const normalizeHeader = (v: unknown): string => cell(v).toLowerCase().replace(/\s+/g, " ");

const HEADER_ALIASES = {
  name: ["name", "ชื่อ", "ชื่อ-นามสกุล"],
  email: ["email", "อีเมล"],
  role: ["role", "บทบาท"],
  section: ["section"],
};

type HeaderKey = keyof typeof HEADER_ALIASES;

function resolveRole(
  rawRole: string,
  rolesList: RoleOption[]
): { role: string | null; error: string | null } {
  const trimmed = cell(rawRole);
  if (!trimmed) return { role: "student", error: null };

  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { role: "student", error: null };

  const resolved: string[] = [];
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

export function parseUserImportRows(
  rows: unknown[][],
  {
    firstRow = 1,
    rolesList = [],
    sectionsList = [],
    existingUsers = [],
  }: {
    firstRow?: number;
    rolesList?: RoleOption[];
    sectionsList?: SectionOption[];
    existingUsers?: ExistingUserOption[];
  } = {}
): { parsedRows: ParsedImportRow[]; fileError: string | null } {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { parsedRows: [], fileError: "ไม่พบข้อมูลในไฟล์" };
  }

  const headers = (rows[0] || []).map(normalizeHeader);
  const colIndex: Record<HeaderKey, number> = {
    name: -1,
    email: -1,
    role: -1,
    section: -1,
  };
  for (const [key, aliases] of Object.entries(HEADER_ALIASES) as Array<[HeaderKey, string[]]>) {
    colIndex[key] = headers.findIndex((h) => aliases.includes(h));
  }

  const missing: string[] = [];
  if (colIndex.name < 0) missing.push("name/ชื่อ");
  if (colIndex.email < 0) missing.push("email/อีเมล");
  if (missing.length > 0) {
    return {
      parsedRows: [],
      fileError: `ไม่พบคอลัมน์ ${missing.join(", ")} ในแถวหัวตาราง (แถวที่ ${firstRow})`,
    };
  }

  const body: Array<{ r: unknown[]; rowNum: number }> = [];
  rows.slice(1).forEach((r, i) => {
    if ((r || []).some((c) => cell(c) !== "")) {
      body.push({ r, rowNum: firstRow + 1 + i });
    }
  });

  if (body.length === 0) {
    return { parsedRows: [], fileError: "ไม่พบข้อมูลผู้ใช้ในไฟล์ (มีแต่แถวหัวตาราง)" };
  }

  const existingByEmail = new Map<string, ExistingUserOption>();
  for (const u of existingUsers || []) {
    const em = cell(u.email).toLowerCase();
    if (em) existingByEmail.set(em, u);
  }

  const seenEmails = new Map<string, number>();
  const parsedRows: ParsedImportRow[] = body.map(({ r, rowNum }) => {
    const get = (k: HeaderKey) => (colIndex[k] < 0 ? "" : cell(r[colIndex[k]]));

    const name = get("name");
    const email = get("email").toLowerCase();
    const rawRole = get("role");
    const rawSection = get("section");
    const reasons: string[] = [];

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
        resolvedSection = secMatch.name || rawSection;
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

function makeUniqueUserId(index: number): string {
  return `u_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
}

async function runInChunks<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

async function findUsersByEmails(emails: string[]): Promise<{
  data: ExistingUserOption[];
  error: { message: string } | null;
}> {
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

function updateImportedUser(row: { name: string; role: string; section: string }, id: string) {
  return supabase
    .from("users")
    .update({ name: row.name, role: row.role, section: row.section })
    .eq("id", id);
}

/** Inserts new users and updates existing ones (matched by email). `lookupError` set = nothing was written. */
export async function saveImportRows(okRows: ParsedImportRow[]): Promise<{
  lookupError: string | null;
  inserted: number;
  updated: number;
  saveErrors: string[];
}> {
  const { data: currentUsers, error: lookupError } = await findUsersByEmails(okRows.map((r) => r.email));
  if (lookupError) return { lookupError: lookupError.message, inserted: 0, updated: 0, saveErrors: [] };
  const currentByEmail = new Map(currentUsers.map((u) => [cell(u.email).toLowerCase(), u.id]));
  const toInsert = okRows.filter((r) => !currentByEmail.has(r.email));
  const toUpdate = okRows.filter((r) => currentByEmail.has(r.email));

  let inserted = 0;
  let updated = 0;
  const saveErrors: string[] = [];

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
        if (recheckError) return { item, error: recheckError, updated: false };
        if (matches.length > 0) {
          const { error } = await updateImportedUser(item.payload, matches[0].id);
          return { item, error, updated: true };
        }

        const { error: insertError } = await supabase.from("users").insert([item.payload]);
        if (insertError?.code !== "23505") return { item, error: insertError, updated: false };

        const { data: conflictedUsers, error: conflictLookupError } = await findUsersByEmails([item.email]);
        if (conflictLookupError || conflictedUsers.length === 0) {
          return { item, error: conflictLookupError || insertError, updated: false };
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
      const targetId = currentByEmail.get(r.email);
      if (!targetId) {
        return { r, error: { message: "ไม่พบผู้ใช้ในระบบ" } };
      }
      const { error } = await updateImportedUser(r, targetId);
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

  return { lookupError: null, inserted, updated, saveErrors };
}
