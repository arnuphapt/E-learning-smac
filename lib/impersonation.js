// Decides what a credentials sign-in attempt is, given the caller's CURRENT (verified) NextAuth token.
// 'revert'      -> only back to the admin recorded in the token when impersonation started
// 'impersonate' -> caller must still be re-checked against the DB for users:impersonate
// null          -> deny (no session, or trying to chain/switch while impersonating)
export function switchKind(token, targetId) {
  const caller = token?.dbId;
  if (!caller || !targetId) return null;
  if (token.originalAdminId) return targetId === token.originalAdminId ? "revert" : null;
  return "impersonate";
}
