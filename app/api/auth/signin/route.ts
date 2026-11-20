import { NextResponse, type NextRequest } from "next/server";
import { CALLBACK_PATH, NEXT_COOKIE, STATE_COOKIE, generateState, github } from "@/auth/github";
import { env } from "@/env";
import { safePath } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

/** Start GitHub sign-in. A GET link (not a form post) so CSP form-action never blocks the redirect to github.com. */
export function GET(req: NextRequest) {
  const state = generateState();
  const url = github(req.nextUrl.origin).createAuthorizationURL(state, []);
  const res = NextResponse.redirect(url, 302);
  const opts = { httpOnly: true, secure: env.isProduction(), sameSite: "lax" as const, path: CALLBACK_PATH, maxAge: 600 };
  res.cookies.set(STATE_COOKIE, state, opts);
  res.cookies.set(NEXT_COOKIE, safePath(req.nextUrl.searchParams.get("next")), opts);
  res.headers.set("cache-control", "no-store");
  return res;
}
