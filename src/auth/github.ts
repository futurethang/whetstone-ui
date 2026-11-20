import "server-only";
import { GitHub, generateState } from "arctic";
import { z } from "zod";
import { env } from "@/env";

export const CALLBACK_PATH = "/api/auth/callback/github";
export const STATE_COOKIE = "ws_oauth_state";
export const NEXT_COOKIE = "ws_oauth_next";

/** The callback must match the OAuth app's registered URL exactly, so it is built from the request's own origin. */
export function github(origin: string): GitHub {
  return new GitHub(env.githubClientId(), env.githubClientSecret(), `${origin}${CALLBACK_PATH}`);
}

export { generateState };

const GithubUser = z.object({ id: z.number().int(), login: z.string() });

/**
 * The signed-in GitHub user. This is the one fetch outside src/data/client.ts: it talks to GitHub, not the data API.
 * No OAuth scopes are requested; /user works with public data only.
 */
export async function fetchGithubUser(accessToken: string): Promise<{ id: string; login: string }> {
  const res = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/vnd.github+json", "user-agent": "whetstone-web", "x-github-api-version": "2022-11-28" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`GitHub /user returned ${res.status}`);
  const u = GithubUser.parse(await res.json());
  return { id: String(u.id), login: u.login };
}
