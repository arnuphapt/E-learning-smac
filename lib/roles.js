// users.role is a comma-separated list (e.g. "course_manager,instructor"); match exact role ids.
export const hasRole = (roleStr, ...ids) =>
  String(roleStr || "").split(",").map((r) => r.trim()).some((r) => ids.includes(r));

export const isStaffRole = (roleStr) => hasRole(roleStr, "instructor", "admin", "course_manager");
