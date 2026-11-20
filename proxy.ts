import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/auth/session";

/** Routes reachable without an owner session. */
const PUBLIC_PREFIXES = ["/signin", "/api/auth", "/api/revalidate", "/api/theme"];

function contentSecurityPolicy(nonce: string, dev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Next.js puts the nonce on the inline styles it generates; style attributes stay blocked.
    `style-src 'self' 'nonce-${nonce}'${dev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join("; ");
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Runs before every page and route: a per-request nonce CSP for all responses, and an owner-session gate
 * for everything except the public routes above. Pages check the session again (src/auth/owner.ts).
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  const { pathname, search } = request.nextUrl;

  let response: NextResponse;
  const secret = process.env.AUTH_SECRET ?? "";
  const owner = process.env.OWNER_GITHUB_ID ?? "";
  const session = isPublic(pathname) || !secret || !owner ? null : await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret, owner);

  if (!isPublic(pathname) && !session) {
    if (pathname.startsWith("/api/")) {
      response = NextResponse.json({ error: "unauthorized" }, { status: 401 });
    } else {
      const to = request.nextUrl.clone();
      to.pathname = "/signin";
      to.search = pathname === "/" && !search ? "" : `?next=${encodeURIComponent(pathname + search)}`;
      response = NextResponse.redirect(to, 303);
    }
  } else {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("content-security-policy", csp);
    headers.set("x-pathname", pathname + search);
    response = NextResponse.next({ request: { headers } });
    // Owner pages only: prerender a linked page on hover (app/speculation-rules.json/route.ts).
    if (session && !pathname.startsWith("/api/")) response.headers.set("speculation-rules", '"/speculation-rules.json"');
  }
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
