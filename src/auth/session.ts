/**
 * Owner session: a signed JWT (HS256) in an HttpOnly cookie. No database.
 * Pure module (no server-only import) so proxy.ts and the e2e tests can use it; callers pass the secret.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ws_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ISSUER = "whetstone-web";

export type Session = { githubId: string; login: string };

const key = (secret: string) => new TextEncoder().encode(secret);

export async function signSession(s: Session, secret: string, maxAge = SESSION_MAX_AGE): Promise<string> {
  return new SignJWT({ login: s.login })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.githubId)
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(key(secret));
}

/** Returns the session only if the token is valid, unexpired, and belongs to the owner. */
export async function verifySession(token: string | undefined, secret: string, ownerGithubId: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { issuer: ISSUER, audience: ISSUER, algorithms: ["HS256"] });
    if (payload.sub !== ownerGithubId || typeof payload.login !== "string") return null;
    return { githubId: payload.sub, login: payload.login };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure: boolean, maxAge = SESSION_MAX_AGE) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge };
}
