import styles from "@/ui/feedback/Loading.module.css";

/** Plain text, shown only if loading takes longer than 300 ms. No skeletons. */
export default function Loading() {
  return (
    <p className={styles.loading} role="status">
      Loading…
    </p>
  );
}
