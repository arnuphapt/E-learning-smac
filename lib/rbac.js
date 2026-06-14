export const PERMISSIONS = {
  COURSES_VIEW: "courses:view",
  COURSES_CREATE: "courses:create",
  COURSES_EDIT: "courses:edit",
  COURSES_DELETE: "courses:delete",
  
  LESSONS_VIEW: "lessons:view",
  LESSONS_CREATE: "lessons:create",
  LESSONS_EDIT: "lessons:edit",
  LESSONS_DELETE: "lessons:delete",
  
  SUBMISSIONS_VIEW: "submissions:view",
  SUBMISSIONS_GRADE: "submissions:grade",
  
  REPORTS_VIEW: "reports:view",
  
  MASTER_MANAGE: "master:manage",
  USERS_MANAGE: "users:manage",
  USERS_IMPERSONATE: "users:impersonate",
  BROADCASTS_MANAGE: "broadcasts:manage",
};

/**
 * Check if a user has a specific permission
 * @param {object} user - The user object from session (should contain permissions array)
 * @param {string} permission - The permission to check
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specific permissions
 * @param {object} user - The user object from session
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export function hasAnyPermission(user, permissions) {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  return permissions.some((p) => user.permissions.includes(p));
}

/**
 * Check if a user has all of the specific permissions
 * @param {object} user - The user object from session
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
export function hasAllPermissions(user, permissions) {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  return permissions.every((p) => user.permissions.includes(p));
}
