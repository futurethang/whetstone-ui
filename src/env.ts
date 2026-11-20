import "server-only";

/** Server-only configuration. Read lazily so a missing value fails the request that needs it, not the build. */
function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new ConfigError(`${name} is not set in this deployment's environment variables`);
  return v;
}

/** Thrown for a missing or invalid setting. Messages name the variable but never include its value. */
export class ConfigError extends Error {
  override name = "ConfigError";
}

/**
 * The data API root, e.g. https://whetstone.vercel.app/api. Tolerates a trailing slash or "/v1"
 * (the client adds /v1 itself) and rejects anything that is not an absolute http(s) URL.
 */
export function normalizeApiUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new ConfigError("WHETSTONE_API_URL is not a full URL. It should look like https://<data-app>.vercel.app/api");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new ConfigError("WHETSTONE_API_URL must start with https://");
  if (u.search || u.hash) throw new ConfigError("WHETSTONE_API_URL must not include a query string or fragment");
  return (u.origin + u.pathname).replace(/\/+$/, "").replace(/\/v1$/, "");
}

export const env = {
  apiUrl: () => normalizeApiUrl(required("WHETSTONE_API_URL")),
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
