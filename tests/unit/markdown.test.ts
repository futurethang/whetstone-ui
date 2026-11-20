import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/data/markdown";

const html = (md: string) => renderMarkdown(md).__html;

describe("markdown pipeline", () => {
  it("drops raw HTML and scripts", () => {
    const out = html('Hello <script>alert(1)</script> <img src=x onerror="alert(2)"> <b onclick="x()">bold</b>');
    expect(out).not.toMatch(/<script|onerror|onclick|<b[ >]/i);
  });

  it("removes javascript: links", () => {
    expect(html("[click](javascript:alert(1))")).not.toContain("javascript:");
  });

  it("turns images into links (CSP blocks remote images)", () => {
    const out = html("![A diagram](https://example.com/d.png)");
    expect(out).not.toContain("<img");
    expect(out).toContain('href="https://example.com/d.png"');
    expect(out).toContain("Image: A diagram");
  });

  it("marks external links and adds rel", () => {
    const out = html("[MDN](https://developer.mozilla.org/)");
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain("↗");
    expect(out).toContain("(opens external site)");
  });

  it("leaves internal links alone and demotes headings below the page outline", () => {
    const out = html("[x](/e/foo)\n\n# Big\n\n### For");
    expect(out).toContain('<a href="/e/foo">x</a>');
    expect(out).toContain("<h3>Big</h3>");
    expect(out).toContain("<h3>For</h3>");
  });

  it("supports GFM tables and task lists", () => {
    expect(html("| a | b |\n| - | - |\n| 1 | 2 |")).toContain("<table>");
  });
});
