import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/env";
import { SESSION_COOKIE, verifySession, type Session } from "./session";

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, env.authSecret(), env.ownerGithubId());
}

/** Defence in depth: proxy.ts already gates every page, and owner pages check again here. */
export async function requireOwner(): Promise<Session> {
  const s = await currentSession();
  if (!s) redirect("/signin");
  return s;
}
