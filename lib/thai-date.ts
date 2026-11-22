const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "5 ก.ค. 2568" -> "2025-07-05" (for <input type="date">). "" when it does not parse. */
export function parseThaiDateToISO(thaiDateStr: string | null | undefined): string {
  if (!thaiDateStr) return "";
  const parts = thaiDateStr.split(" ");
  if (parts.length !== 3) return "";
  const monthIdx = THAI_MONTHS.indexOf(parts[1]);
  if (monthIdx === -1) return "";
  const yearCE = parseInt(parts[2], 10) - 543;
  return `${yearCE}-${String(monthIdx + 1).padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
}

/** "2025-07-05" -> "5 ก.ค. 2568". */
export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map((p) => parseInt(p, 10));
  return `${day} ${THAI_MONTHS[month - 1]} ${year + 543}`;
}
