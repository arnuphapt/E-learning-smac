// Pure parser for the tutor question bank Excel import. No xlsx / DOM imports: safe for client and node --test.
// The page reads the sheet with xlsx into an array of rows (first row = headers) and hands it to parseImportRows().
import { normalizeTopic } from "./tutor-bank.ts";
import { uniqueChoiceId } from "./questions.ts";

export const MAX_IMPORT_ROWS = 500;
const LABELS = ["ก", "ข", "ค", "ง", "จ"] as const;
export const TEMPLATE_HEADERS: string[] = ["โจทย์", ...LABELS.map((l) => "ตัวเลือก " + l), "เฉลย", "คำอธิบาย", "หัวข้อ"];
export const TEMPLATE_EXAMPLES: string[][] = [
  ["ข้อใดคือสัญญาณชีพ", "ชีพจร", "สีผม", "", "", "", "ก", "ชีพจรเป็นหนึ่งในสัญญาณชีพ", "สัญญาณชีพ"],
  ["ค่าปกติของอุณหภูมิร่างกายคือข้อใด", "30 องศา", "37 องศา", "45 องศา", "", "", "ข", "", "สัญญาณชีพ"],
];

const cell = (v: unknown): string => String(v ?? "").trim();
// header match ignores case, whitespace and punctuation: "ตัวเลือก  ก", "ตัวเลือก(ก)", "ตัวเลือกก" are the same
const key = (v: unknown): string => cell(v).toLowerCase().replace(/[\s().:_-]+/g, "");

const COLS: Record<string, string[]> = {
  text: ["โจทย์", "โจทย์คำถาม", "คำถาม"],
  answer: ["เฉลย", "คำตอบ"],
  explanation: ["คำอธิบาย", "คำอธิบายเฉลย"],
  topic: ["หัวข้อ"],
};
LABELS.forEach((l, i) => { COLS["c" + i] = ["ตัวเลือก" + l, "ตัวเลือก" + "abcde"[i]]; });

// "ก" / "A" / "a." / 1 -> 0..4, else -1
function answerIndex(raw: unknown): number {
  const s = key(raw);
  const i = (LABELS as readonly string[]).indexOf(s);
  if (i >= 0) return i;
  const j = "abcde".indexOf(s);
  if (s.length === 1 && j >= 0) return j;
  return /^[1-5]$/.test(s) ? Number(s) - 1 : -1;
}

export interface ImportChoice {
  id: string;
  text: string;
}

export interface ImportedQuestionRow {
  row: number;
  text: string;
  choices: ImportChoice[];
  answer: string;
  explanation: string;
  topicName: string;
}

export interface ImportErrorRow {
  row: number | null;
  message: string;
}

export interface ParseImportResult {
  ok: ImportedQuestionRow[];
  errors: ImportErrorRow[];
}

export interface ParseImportOptions {
  firstRow?: number;
  existingTopics?: readonly { name?: string | null }[];
}

// rows: array of arrays, rows[0] = headers. firstRow: the sheet row number of rows[0] (default 1) so errors match Excel.
// existingTopics: [{name}] of the lesson; their spelling wins over the file's.
// Returns { ok: [{ row, text, choices: [{id, text}], answer, explanation, topicName }], errors: [{ row, message }] }.
// row is null for file-level errors.
export function parseImportRows(
  rows: unknown,
  { firstRow = 1, existingTopics = [] }: ParseImportOptions = {}
): ParseImportResult {
  const fail = (message: string, row: number | null = null): ParseImportResult => ({ ok: [], errors: [{ row, message }] });
  if (!Array.isArray(rows) || !rows.length) return fail("ไม่พบข้อมูลในไฟล์");

  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const header = headerRow.map(key);
  const at: Record<string, number> = {};
  for (const [name, aliases] of Object.entries(COLS)) at[name] = header.findIndex((h) => aliases.includes(h));
  const missing = [["text", "โจทย์"], ["c0", "ตัวเลือก ก"], ["c1", "ตัวเลือก ข"], ["answer", "เฉลย"]].filter(([n]) => at[n] < 0);
  if (missing.length) return fail("ไม่พบคอลัมน์ " + missing.map(([, l]) => l).join(", ") + " ในแถวหัวตาราง ใช้ไฟล์ตัวอย่างเป็นต้นแบบ", firstRow);

  const body: Array<{ r: unknown[]; row: number }> = [];
  rows.slice(1).forEach((rawRow: unknown, i: number) => {
    const r = Array.isArray(rawRow) ? rawRow : [];
    if (r.some((c) => cell(c) !== "")) body.push({ r, row: firstRow + 1 + i });
  });
  if (!body.length) return fail("ไม่พบข้อสอบในไฟล์ (มีแต่แถวหัวตาราง)");
  if (body.length > MAX_IMPORT_ROWS) return fail(`ไฟล์มี ${body.length} แถว เกินที่นำเข้าได้ครั้งละ ${MAX_IMPORT_ROWS} แถว กรุณาแบ่งไฟล์`);

  // one spelling per topic (case-insensitive): existing lesson topics first, then the first spelling seen in the file
  const spelling = new Map(existingTopics.map((t) => [normalizeTopic(t.name).toLowerCase(), normalizeTopic(t.name)]));
  const ok: ImportedQuestionRow[] = [];
  const errors: ImportErrorRow[] = [];
  for (const { r, row } of body) {
    const get = (n: string): string => (at[n] < 0 ? "" : cell(r[at[n]]));
    const text = get("text");
    if (!text) { errors.push({ row, message: "ไม่มีโจทย์" }); continue; }
    const present = LABELS.map((_, i) => ({ i, text: get("c" + i) })).filter((c) => c.text);
    if (present.length < 2) { errors.push({ row, message: "ต้องมีตัวเลือกอย่างน้อย 2 ข้อ" }); continue; }
    const rawAnswer = get("answer");
    const ai = answerIndex(rawAnswer);
    if (ai < 0) { errors.push({ row, message: rawAnswer ? `เฉลย "${rawAnswer}" ไม่ถูกต้อง (ใช้ ก-จ, A-E หรือ 1-5)` : "ไม่มีเฉลย" }); continue; }
    if (!present.some((c) => c.i === ai)) { errors.push({ row, message: `เฉลยชี้ไปที่ตัวเลือก ${LABELS[ai]} ซึ่งว่างอยู่` }); continue; }

    const choices = present.map((c) => ({ id: uniqueChoiceId(), text: c.text, i: c.i }));
    const topic = normalizeTopic(get("topic"));
    let topicName = "";
    if (topic) {
      if (!spelling.has(topic.toLowerCase())) spelling.set(topic.toLowerCase(), topic);
      topicName = spelling.get(topic.toLowerCase()) ?? topic;
    }
    const answerChoice = choices.find((c) => c.i === ai);
    ok.push({
      row,
      text,
      choices: choices.map(({ id, text }) => ({ id, text })),
      answer: answerChoice ? answerChoice.id : "",
      explanation: get("explanation"),
      topicName,
    });
  }
  return { ok, errors };
}
