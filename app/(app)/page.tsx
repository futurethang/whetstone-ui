import type { Metadata } from "next";
import { ApiError } from "@/data/client";
import type { Topic } from "@/data/models";
import { getTopics } from "@/data/topics";
import { ApiNotice } from "@/ui/feedback/ApiNotice";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Home" };

/**
 * Milestone 2 placeholder: proves the authenticated path to the data API end to end.
 * Milestone 4 replaces it with the real Home (changes since last visit, due for review, pipeline line).
 */
export default async function HomePage() {
  let topics: Topic[];
  try {
    topics = await getTopics();
  } catch (e) {
    if (e instanceof ApiError) return <ApiNotice error={e} heading="Whetstone" />;
    throw e;
  }
  const top = topics.filter((t) => t.depth === 0);
  return (
    <>
      <h1>Whetstone</h1>
      <p className={styles.lede}>
        Connected to the data API: {topics.length} topics, {top.length} at the top level.
      </p>
      <h2 id="topics">Topics</h2>
      <ul className={styles.topics} aria-labelledby="topics">
        {top.map((t) => (
          <li key={t.id}>
            <span className={styles.label}>{t.label}</span>{" "}
            <span className={styles.count}>
              {t.entryCount} {t.entryCount === 1 ? "entry" : "entries"}
              {t.staleCount > 0 ? `, ${t.staleCount} stale` : ""}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
