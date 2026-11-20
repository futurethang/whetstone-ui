import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { env } from "@/env";

export const dynamic = "force-dynamic";

const TAG = /^(entries|topics|features|pipeline|digest|entry:[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const Body = z.object({ tags: z.array(z.string().max(100).regex(TAG)).min(1).max(50) }).strict();

const digest = (s: string) => createHash("sha256").update(s).digest();

function authorized(req: Request): boolean {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization")?.trim() ?? "");
  if (!m) return false;
  try {
    return timingSafeEqual(digest(m[1]!.trim()), digest(env.revalidateSecret()));
  } catch {
    return false;
  }
}

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Cache refresh webhook for the data layer: POST { "tags": ["entries", "entry:<id>"] }
 * with "Authorization: Bearer <REVALIDATE_SECRET>". Tags expire immediately.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return json(401, { error: "unauthorized" });
  const text = await req.text();
  if (text.length > 8 * 1024) return json(413, { error: "request body too large" });
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: "invalid JSON body" });
  }
  const p = Body.safeParse(raw);
  if (!p.success) return json(400, { error: "invalid request", issues: p.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) });
  const tags = [...new Set(p.data.tags)];
  for (const t of tags) revalidateTag(t, { expire: 0 });
  return json(200, { revalidated: tags });
}
