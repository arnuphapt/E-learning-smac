type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseHubName(raw: unknown): ParseResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, error: "กรุณาระบุชื่อ hub" };
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 120) {
    return { ok: false, error: "ชื่อ hub ต้องมีความยาว 1-120 ตัวอักษร" };
  }
  return { ok: true, value: trimmed };
}

/** Strict: `raw` must be an array. POST maps an omitted value to `[]` itself. */
export function parseYearLevel(raw: unknown): ParseResult<number[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "ชั้นปีต้องเป็นรายการตัวเลข" };
  }
  const seen = new Set<number>();
  for (const item of raw) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 1) {
      return { ok: false, error: "ชั้นปีต้องเป็นจำนวนเต็มบวก" };
    }
    seen.add(item);
  }
  return { ok: true, value: Array.from(seen).sort((a, b) => a - b) };
}
