import styles from "./Shell.module.css";

export function SkipLink() {
  return (
    <a className={styles.skip} href="#main">
      Skip to content
    </a>
  );
}
