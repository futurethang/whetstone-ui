import { describe, expect, it } from "vitest";
import { safePath } from "@/lib/safe-path";

describe("safePath", () => {
  it.each(["/", "/e/has?x=1", "/search?q=a%20b#r"])("keeps %s", (p) => expect(safePath(p)).toBe(p));
  it.each(["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", "evil", "", null, undefined, "/a\nb", "/\\\\evil"])(
    "rejects %j",
    (p) => expect(safePath(p as string)).toBe("/"),
  );
});
