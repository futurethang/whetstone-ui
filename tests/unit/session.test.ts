import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/auth/session";

const SECRET = "s".repeat(40);

describe("owner session", () => {
  it("round-trips for the owner", async () => {
    const t = await signSession({ githubId: "17099707", login: "owner" }, SECRET);
    expect(await verifySession(t, SECRET, "17099707")).toEqual({ githubId: "17099707", login: "owner" });
  });

  it("rejects another GitHub user, a wrong secret, tampering, expiry and alg confusion", async () => {
    const t = await signSession({ githubId: "1", login: "someone" }, SECRET);
    expect(await verifySession(t, SECRET, "17099707")).toBeNull();
    const own = await signSession({ githubId: "17099707", login: "owner" }, SECRET);
    expect(await verifySession(own, "x".repeat(40), "17099707")).toBeNull();
    expect(await verifySession(own.slice(0, -2) + "xx", SECRET, "17099707")).toBeNull();
    const expired = await signSession({ githubId: "17099707", login: "owner" }, SECRET, -10);
    expect(await verifySession(expired, SECRET, "17099707")).toBeNull();
    const unsigned = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"17099707","login":"o"}').toString("base64url")}.`;
    expect(await verifySession(unsigned, SECRET, "17099707")).toBeNull();
    const wrongAud = await new SignJWT({ login: "o" }).setProtectedHeader({ alg: "HS256" }).setSubject("17099707").setIssuer("whetstone-web").setAudience("other").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
    expect(await verifySession(wrongAud, SECRET, "17099707")).toBeNull();
    expect(await verifySession(undefined, SECRET, "17099707")).toBeNull();
  });
});
