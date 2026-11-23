/**
 * Year-level lock used by announcements and the student course list: an empty/missing list is open to everyone,
 * a numeric entry matches the student's study year, any other entry matches the student's year label.
 */
export function matchesYearLevel(
  allowed: ReadonlyArray<number | string> | null | undefined,
  studentYear: number | null,
  studentLabel: string | null,
): boolean {
  if (!allowed || allowed.length === 0) return true
  return allowed.some((ay) => {
    if (typeof ay === "number" || !isNaN(Number(ay))) return Number(ay) === studentYear
    return ay === studentLabel
  })
}
