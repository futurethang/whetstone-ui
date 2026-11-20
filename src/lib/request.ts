/** Reject cross-site form posts. Browsers send Origin on POST; a mismatch means another site submitted the form. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** 303 so a POSTed form lands on a GET. Relative Location keeps the host the browser used. */
export function seeOther(path: string, headers?: HeadersInit): Response {
  const h = new Headers(headers);
  h.set("location", path);
  h.set("cache-control", "no-store");
  return new Response(null, { status: 303, headers: h });
}
