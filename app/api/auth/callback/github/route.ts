import { timingSafeEqual } from "node:crypto";
import { OAuth2RequestError } from "arctic";
import { NextResponse, type NextRequest } from "next/server";
import { CALLBACK_PATH, NEXT_COOKIE, STATE_COOKIE, fetchGithubUser, github } from "@/auth/github";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/auth/session";
import { env } from "@/env";
import { safePath } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function fail(req: NextRequest, reason: "state" | "denied" | "github") {
  const to = req.nextUrl.clone();
  to.pathname = "/signin";
  to.search = `?error=${reason}`;
  const res = NextResponse.redirect(to, 303);
  res.cookies.set(STATE_COOKIE, "", { path: CALLBACK_PATH, maxAge: 0 });
  res.cookies.set(NEXT_COOKIE, "", { path: CALLBACK_PATH, maxAge: 0 });
  res.headers.set("cache-control", "no-store");
  return res;
}

/** GitHub redirects here. Check state, exchange the code, and admit only OWNER_GITHUB_ID. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expected = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expected || !sameString(state, expected)) return fail(req, "state");

  let user: { id: string; login: string };
  try {
    const tokens = await github(req.nextUrl.origin).validateAuthorizationCode(code);
    user = await fetchGithubUser(tokens.accessToken());
  } catch (e) {
    console.error(JSON.stringify({ event: "github_signin_failed", kind: e instanceof OAuth2RequestError ? e.code : e instanceof Error ? e.name : "error" }));
    return fail(req, "github");
  }
  if (user.id !== env.ownerGithubId()) {
    console.warn(JSON.stringify({ event: "signin_denied", login: user.login }));
    return fail(req, "denied");
  }

  const next = safePath(req.cookies.get(NEXT_COOKIE)?.value);
  const res = NextResponse.redirect(new URL(next, req.nextUrl.origin), 303);
  res.cookies.set(SESSION_COOKIE, await signSession({ githubId: user.id, login: user.login }, env.authSecret()), sessionCookieOptions(env.isProduction()));
  res.cookies.set(STATE_COOKIE, "", { path: CALLBACK_PATH, maxAge: 0 });
  res.cookies.set(NEXT_COOKIE, "", { path: CALLBACK_PATH, maxAge: 0 });
  res.headers.set("cache-control", "no-store");
  return res;
}
