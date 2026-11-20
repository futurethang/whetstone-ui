import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { safePath } from "@/lib/safe-path";
import { isSameOrigin, seeOther } from "@/lib/request";

export const dynamic = "force-dynamic";

/** No-JS theme switch: the footer form posts here, we set the cookie and send the browser back. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return new Response("Forbidden", { status: 403 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const theme = parseTheme(String(form.get("theme") ?? ""));
  const back = safePath(String(form.get("return_to") ?? "/"));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookie = theme === "system" ? `${THEME_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}` : `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`;
  return seeOther(back, { "set-cookie": cookie });
}
