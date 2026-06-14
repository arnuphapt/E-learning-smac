export const PERMISSIONS = {
  MANAGE_COURSES: "manage_courses",
  GRADE_SUBMISSIONS: "grade_submissions",
  MANAGE_USERS: "manage_users",
  MANAGE_MASTER_DATA: "manage_master_data",
  VIEW_REPORTS: "view_reports",
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
