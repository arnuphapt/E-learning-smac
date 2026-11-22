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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface UserWithPermissions {
  permissions?: readonly string[] | null;
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: UserWithPermissions | null | undefined, permission: string): boolean {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if a user has any of the specific permissions
 */
export function hasAnyPermission(user: UserWithPermissions | null | undefined, permissions: readonly string[]): boolean {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  const userPerms = user.permissions;
  return permissions.some((p) => userPerms.includes(p));
}

/**
 * Check if a user has all of the specific permissions
 */
export function hasAllPermissions(user: UserWithPermissions | null | undefined, permissions: readonly string[]): boolean {
  if (!user || !user.permissions || !Array.isArray(user.permissions)) return false;
  const userPerms = user.permissions;
  return permissions.every((p) => userPerms.includes(p));
}
