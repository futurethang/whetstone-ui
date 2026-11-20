/**
 * Markdown → sanitised HTML, server-side only (spec: unified + remark-gfm + rehype-sanitize, default schema,
 * no raw HTML). After sanitising:
 * - images become links (CSP img-src blocks remote images),
 * - external links get rel="noopener noreferrer" and a ↗ marker with visually hidden "opens external site",
 * - headings are demoted so body content never competes with the page's h1/h2 outline.
 */
import type { Element, ElementContent, Root } from "hast";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { SafeHtml } from "./models";

const text = (value: string): ElementContent => ({ type: "text", value });

function isExternal(href: unknown): href is string {
  return typeof href === "string" && /^https?:\/\//i.test(href);
}

function textOf(node: Element): string {
  let s = "";
  visit(node, "text", (t) => {
    s += t.value;
  });
  return s;
}

function externalMarker(): ElementContent[] {
  return [
    { type: "element", tagName: "span", properties: { ariaHidden: "true", className: ["ext"] }, children: [text("↗")] },
    { type: "element", tagName: "span", properties: { className: ["visually-hidden"] }, children: [text(" (opens external site)")] },
  ];
}

/** `minHeading`: the highest level a body heading may use (3 inside an h2 section). */
function rehypeWhetstone(opts: { minHeading: number }) {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName === "img" && parent && typeof index === "number") {
        const src = node.properties?.src;
        const alt = typeof node.properties?.alt === "string" && node.properties.alt ? node.properties.alt : "Image";
        const link: Element = { type: "element", tagName: "a", properties: { href: typeof src === "string" ? src : undefined }, children: [text(`Image: ${alt}`)] };
        parent.children[index] = link;
        node = link;
      }
      if (node.tagName === "a") {
        const href = node.properties?.href;
        if (isExternal(href)) {
          node.properties = { ...node.properties, rel: ["noopener", "noreferrer"] };
          if (!textOf(node).includes("↗")) node.children.push(...externalMarker());
        }
      }
      const h = /^h([1-6])$/.exec(node.tagName);
      if (h) node.tagName = `h${Math.min(6, Math.max(Number(h[1]), opts.minHeading))}`;
    });
  };
}

export function renderMarkdown(markdown: string, opts: { minHeading?: number } = {}): SafeHtml {
  const html = String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype) // raw HTML in markdown is dropped, not passed through
      .use(rehypeSanitize)
      .use(rehypeWhetstone, { minHeading: opts.minHeading ?? 3 })
      .use(rehypeStringify)
      .processSync(markdown),
  );
  return { __html: html, __brand: "SafeHtml" } as SafeHtml;
}

/** Inline markdown (one line, no wrapping <p>). */
export function renderInline(markdown: string): SafeHtml {
  const out = renderMarkdown(markdown).__html.replace(/^<p>([\s\S]*)<\/p>\s*$/, "$1");
  return { __html: out, __brand: "SafeHtml" } as SafeHtml;
}
