// xlsx is loaded on demand: only the bank import, its template download and the results export need it.
export const loadXlsx = async () => {
  const m = await import("xlsx")
  return m.utils ? m : m.default
}
