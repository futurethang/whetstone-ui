import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/auth/owner";
import { safePath } from "@/lib/safe-path";
import { SiteFooter } from "@/ui/layout/SiteFooter";
import { SkipLink } from "@/ui/layout/SkipLink";
import shell from "@/ui/layout/Shell.module.css";
import styles from "./signin.module.css";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  denied: "That GitHub account is not allowed to use this Whetstone. Sign in with the owner's account.",
  state: "The sign-in link expired or was already used. Start again.",
  github: "GitHub sign-in failed. Try again in a moment.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const next = safePath(one("next"));
  if (await currentSession()) redirect(next);

  const error = ERRORS[one("error") ?? ""];
  const start = next === "/" ? "/api/auth/signin" : `/api/auth/signin?next=${encodeURIComponent(next)}`;
  return (
    <>
      <SkipLink />
      <header className={styles.header}>
        <span className={styles.wordmark}>Whetstone</span>
      </header>
      <main id="main" tabIndex={-1} className={shell.main}>
        <div className={styles.card}>
          <h1>Sign in</h1>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {one("signed_out") && !error ? <p role="status">You are signed out.</p> : null}
          <p>Whetstone is private. Sign in with the owner&rsquo;s GitHub account.</p>
          <p>
            <a className={styles.button} href={start}>
              Sign in with GitHub
            </a>
          </p>
        </div>
      </main>
      <SiteFooter returnTo={next === "/" ? "/signin" : `/signin?next=${encodeURIComponent(next)}`} />
    </>
  );
}
