// Pure helpers for DataTable. Erasable TS only: tests import this file directly with node.

/** Case-insensitive match of `query` against `keys` of `item` (or every primitive field when no keys). */
export function matchesSearch(item: unknown, query: string, keys?: readonly string[]): boolean {
  const q = query.toLowerCase().trim()
  if (!q) return true
  if (item == null || typeof item !== "object") return false
  const record = item as Record<string, unknown>
  const values = keys && keys.length > 0 ? keys.map((k) => record[k]) : Object.values(record)
  return values.some((v) => v != null && typeof v !== "object" && String(v).toLowerCase().includes(q))
}

const isNumeric = (v: unknown) =>
  typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)))

/** Ascending comparator: numbers numerically, everything else with Thai collation. null/undefined sort first. */
export function compareThai(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (isNumeric(a) && isNumeric(b)) return Number(a) - Number(b)
  return String(a).trim().localeCompare(String(b).trim(), "th", { sensitivity: "base" })
}

/** Page numbers to show: first, last, current +-1, with "ellipsis" markers for gaps. */
export function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  const pages = new Set<number>([1, total])
  for (let i = current - 1; i <= current + 1; i++) if (i >= 1 && i <= total) pages.add(i)
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "ellipsis")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("ellipsis")
    out.push(p)
  })
  return out
}
