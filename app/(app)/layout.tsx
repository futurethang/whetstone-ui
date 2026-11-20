import { headers } from "next/headers";
import { requireOwner } from "@/auth/owner";
import { SiteFooter } from "@/ui/layout/SiteFooter";
import { SiteHeader } from "@/ui/layout/SiteHeader";
import { NavigationPending } from "@/ui/feedback/NavigationPending";
import { SkipLink } from "@/ui/layout/SkipLink";
import { SearchShortcut } from "@/ui/search/SearchShortcut";
import styles from "@/ui/layout/Shell.module.css";

/** Every owner page: session check, skip link, header, main#main, footer, and the navigation pending indicator. */
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
      <SearchShortcut />
      <NavigationPending />
    </>
  );
}
