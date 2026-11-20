import { lastVisitCookie } from "@/lib/last-visit";
import { isSameOrigin, seeOther } from "@/lib/request";
import { safePath } from "@/lib/safe-path";

export const dynamic = "force-dynamic";

/** "Mark all seen": move the last-visit cookie to now and go back. Viewing Home never moves it. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new Response("Forbidden", { status: 403 });
  let back = "/";
  try {
    back = safePath(String((await req.formData()).get("return_to") ?? "/"));
  } catch {
    /* no body: return home */
  }
  return seeOther(back, { "set-cookie": lastVisitCookie() });
}
