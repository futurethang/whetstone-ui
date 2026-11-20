"use client";

import { useEffect } from "react";

/**
 * The only global key handler: "/" focuses the search field (the page's own on /search, otherwise the header's),
 * unless focus is already in a text field. One of the two allow-listed client components.
 */
export function SearchShortcut() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const field = (document.getElementById("search-q") ?? document.getElementById("site-search")) as HTMLInputElement | null;
      if (!field) return;
      e.preventDefault();
      field.focus();
      field.select();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
