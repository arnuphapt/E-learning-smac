export const fmtDate = (iso: string | null | undefined, time?: boolean): string =>
  iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—"
