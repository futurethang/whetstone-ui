import { headers } from "next/headers";
import { requireOwner } from "@/auth/owner";
import { SiteFooter } from "@/ui/layout/SiteFooter";
import { SiteHeader } from "@/ui/layout/SiteHeader";
import { SkipLink } from "@/ui/layout/SkipLink";
import styles from "@/ui/layout/Shell.module.css";

/** Every owner page: session check, skip link, header, main#main, footer. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  const path = (await headers()).get("x-pathname") ?? "/";
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <SiteFooter returnTo={path} signedIn />
    </>
  );
}
