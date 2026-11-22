/** Build a canonical one-segment profile destination from untrusted input. */
export function profileRoutePath(username: string): string {
  if (
    !username ||
    username.length > 80 ||
    username === "." ||
    username === ".." ||
    /[\\/?#%\u0000-\u001f\u007f]/u.test(username) ||
    username !== username.trim()
  ) {
    throw new Error("Invalid profile username.");
  }
  return `/profile/${encodeURIComponent(username)}`;
}
