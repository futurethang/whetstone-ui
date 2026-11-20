import "server-only";

/** Server-only configuration. Read lazily so a missing value fails the request that needs it, not the build. */
function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  apiUrl: () => required("WHETSTONE_API_URL").replace(/\/+$/, ""),
  apiToken: () => required("WHETSTONE_API_TOKEN"),
  authSecret: () => {
    const s = required("AUTH_SECRET");
    if (s.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
    return s;
  },
  githubClientId: () => required("AUTH_GITHUB_ID"),
  githubClientSecret: () => required("AUTH_GITHUB_SECRET"),
  ownerGithubId: () => {
    const id = required("OWNER_GITHUB_ID");
    if (!/^\d+$/.test(id)) throw new Error("OWNER_GITHUB_ID must be a numeric GitHub user id");
    return id;
  },
  revalidateSecret: () => required("REVALIDATE_SECRET"),
  isProduction: () => process.env.NODE_ENV === "production",
};
