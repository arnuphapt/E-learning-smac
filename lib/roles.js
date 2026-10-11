// users.role is a comma-separated list (e.g. "course_manager,instructor"); match exact role ids.
export const hasRole = (roleStr, ...ids) =>
  String(roleStr || "").split(",").map((r) => r.trim()).some((r) => ids.includes(r));

export const isStaffRole = (roleStr) => hasRole(roleStr, "instructor", "admin", "course_manager");

// External-domain users (Google sign-in from an allowed domain other than the school's) get this role. They may only
// use tutor mode: middleware.js and the API routes refuse them everywhere else. Never staff, never an RLS instructor.
export const TUTOR_ONLY_ROLE = "tutor_guest";
export const isTutorOnlyRole = (roleStr) => hasRole(roleStr, TUTOR_ONLY_ROLE) && !isStaffRole(roleStr);
