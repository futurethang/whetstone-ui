"use client";

import { useEffect, useState } from "react";
import styles from "./NavigationPending.module.css";

/** Shown only when the next page takes longer than this, so instant (prerendered or cached) loads never flash. */
const DELAY_MS = 150;
/** Give up if the navigation never completes (cancelled with Esc, a download, a dropped connection). */
const RESET_MS = 15_000;

function isPageLink(a: HTMLAnchorElement, e: MouseEvent): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return false;
  const to = new URL(a.href, location.href);
  if (to.origin !== location.origin) return false;
  // Same page with only a different #hash scrolls; it does not load anything.
  return !(to.pathname === location.pathname && to.search === location.search && to.hash !== "");
}

/**
 * Feedback while the next page loads. Every link and form already does a full document load (no client router),
 * so this listens for a same-origin link click or a form submit and, after a short delay, shows a thin bar fixed to
 * the top of the viewport (out of flow, so nothing shifts) and says "Loading page" in a polite live region.
 * Without JavaScript the browser's own loading indicator does this job. Allow-listed in scripts/check-use-client.mjs.
 */
export function NavigationPending() {
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let show: ReturnType<typeof setTimeout> | undefined;
    let reset: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      clearTimeout(show);
      clearTimeout(reset);
      show = setTimeout(() => setPending(true), DELAY_MS);
      reset = setTimeout(stop, RESET_MS);
    };
    const stop = () => {
      clearTimeout(show);
      clearTimeout(reset);
      setPending(false);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (a instanceof HTMLAnchorElement && isPageLink(a, e)) start();
    };
    const onSubmit = (e: SubmitEvent) => {
      if (!e.defaultPrevented) start();
    };
    // Back/forward cache restores the page as it was left: clear the bar.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) stop();
    };
    // Listen in the bubbling phase so handlers that cancel the navigation run first.
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onShow);
    setReady(true);
    return () => {
      stop();
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  return (
    <>
      <div className={styles.bar} data-pending={pending ? "" : undefined} aria-hidden="true" />
      {/* data-ready: listeners are attached (hydrated), so tests know a click will be seen. */}
      <p className="visually-hidden" role="status" id="navigation-status" data-ready={ready ? "" : undefined}>
        {pending ? "Loading page" : ""}
      </p>
    </>
  );
}
