import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/#topics", label: "Topics" },
  { href: "/changes", label: "Changes" },
  { href: "/pipeline", label: "Pipeline" },
];

/** Wordmark, primary nav and a GET search form. Plain links and forms: everything works without JavaScript. */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.wordmark} href="/">
          Whetstone
        </a>
        <nav aria-label="Primary" className={styles.nav}>
          <ul>
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href}>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <form className={styles.search} role="search" action="/search" method="get">
          <label htmlFor="site-search" className="visually-hidden">
            Search entries
          </label>
          <input id="site-search" name="q" type="search" placeholder="Search entries" autoComplete="off" enterKeyHint="search" />
          <button type="submit">Search</button>
        </form>
      </div>
    </header>
  );
}
