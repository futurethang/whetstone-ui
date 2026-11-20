import type { SafeHtml } from "@/data/models";
import s from "./Prose.module.css";

/**
 * The only place HTML is injected. `SafeHtml` is produced solely by src/data/markdown.ts, which sanitises
 * with rehype-sanitize (default schema, no raw HTML), so nothing unsanitised can reach here.
 */
export function Markdown({ html, inline = false, className }: { html: SafeHtml; inline?: boolean; className?: string }) {
  const Tag = inline ? "span" : "div";
  // eslint-disable-next-line no-restricted-syntax -- sanitised by src/data/markdown.ts (SafeHtml brand)
  return <Tag className={`${inline ? "" : s.prose} ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html.__html }} />;
}
