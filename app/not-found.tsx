import type { Metadata } from "next";
import { SkipLink } from "@/ui/layout/SkipLink";
import styles from "@/ui/layout/Shell.module.css";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <main id="main" tabIndex={-1} className={styles.main}>
        <h1>Not found</h1>
        <p>There is nothing at this address.</p>
        <p>
          <a href="/">Go to Home</a>
        </p>
      </main>
    </>
  );
}
