/**
 * Accept only same-site relative paths ("/x?y"), so redirects can never leave the site.
 * Rejects protocol-relative ("//evil"), backslash tricks, schemes and control characters.
 */
export function safePath(input: string | null | undefined, fallback = "/"): string {
  if (!input || input.length > 2000) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\u007f\\]/.test(input)) return fallback;
  try {
    const u = new URL(input, "https://placeholder.invalid");
    if (u.origin !== "https://placeholder.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
