import { SESSION_COOKIE } from "@/auth/session";
import { isSameOrigin, seeOther } from "@/lib/request";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  if (!isSameOrigin(req)) return new Response("Forbidden", { status: 403 });
  return seeOther("/signin?signed_out=1", { "set-cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` });
}
