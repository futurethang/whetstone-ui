"use client";

// Next.js requires error boundaries to be client components; this is one of the allow-listed client files.
import { usePathname } from "next/navigation";
import styles from "@/ui/feedback/Notice.module.css";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  const path = usePathname();
  return (
    <section className={styles.notice} aria-labelledby="error-heading">
      <h1 id="error-heading">Something went wrong</h1>
      <p>This page could not be shown. The error was logged{error.digest ? ` (reference ${error.digest})` : ""}.</p>
      <p>
        <a href={path}>Try again</a>
      </p>
    </section>
  );
}
