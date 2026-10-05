// Pure helpers for the tutor question bank page. No imports: safe for client and node --test.

// Topics are free text per lesson; DB uniqueness is on lower(btrim(name)), so match the same way.
export function normalizeTopic(name) {
  return String(name ?? "").trim();
}

export function findTopic(topics, name) {
  const key = normalizeTopic(name).toLowerCase();
  if (!key) return null;
  return topics.find((t) => normalizeTopic(t.name).toLowerCase() === key) || null;
}

// drawCount: lessons.tutor_draw_count (null = use the whole bank). Returns a warning text or null.
export function bankWarning(bankSize, drawCount) {
  if (bankSize === 0) return "คลังข้อสอบของบทนี้ยังว่าง กรุณาเพิ่มข้อสอบก่อนเปิดให้นักศึกษาใช้";
  if (drawCount != null && bankSize < drawCount) {
    return `คลังมี ${bankSize} ข้อ น้อยกว่าจำนวนที่ตั้งไว้ ${drawCount} ข้อต่อรอบ กรุณาเพิ่มข้อสอบก่อนเปิดให้นักศึกษาใช้`;
  }
  return null;
}

// "" -> null (whole bank); otherwise a positive integer, else undefined (invalid).
export function parseDrawCount(input) {
  const s = String(input ?? "").trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n > 0 ? n : undefined;
}
