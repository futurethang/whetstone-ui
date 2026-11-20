import { cookies } from "next/headers";
import { THEME_COOKIE, THEMES, parseTheme } from "@/lib/theme";
import styles from "./SiteFooter.module.css";

const LABEL = { system: "System", light: "Light", dark: "Dark" } as const;

/** Theme control and sign-out as plain forms, so both work without JavaScript. */
export async function SiteFooter({ returnTo, signedIn = false }: { returnTo: string; signedIn?: boolean }) {
  const current = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <form action="/api/theme" method="post" className={styles.theme}>
          <input type="hidden" name="return_to" value={returnTo} />
          <fieldset>
            <legend>Theme</legend>
            {THEMES.map((t) => (
              <button key={t} type="submit" name="theme" value={t} aria-pressed={t === current}>
                {LABEL[t]}
              </button>
            ))}
          </fieldset>
        </form>
        {signedIn ? (
          <form action="/api/auth/signout" method="post">
            <button type="submit" className={styles.signout}>
              Sign out
            </button>
          </form>
        ) : null}
      </div>
    </footer>
  );
}
