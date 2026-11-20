import type { ApiError } from "@/data/client";
import styles from "./Notice.module.css";

/** Shown instead of partial content when the data API fails. Names the failing data source. */
export function ApiNotice({ error, heading }: { error: ApiError; heading: string }) {
  return (
    <>
      <h1>{heading}</h1>
      <section className={styles.notice} aria-labelledby="api-notice-heading">
        <h2 id="api-notice-heading">The data could not be loaded</h2>
        <p>
          Loading <strong>{error.source}</strong> from the data API failed. {error.message}
        </p>
        <p className={styles.detail}>{error.status ? `HTTP ${error.status}. ` : ""}Reload the page to try again.</p>
      </section>
    </>
  );
}
