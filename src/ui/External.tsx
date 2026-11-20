/** An external link: rel="noopener noreferrer", a ↗ marker, and "opens external site" for screen readers. */
export function External({ href, children }: { href: string; children: React.ReactNode }) {
  if (!/^https?:\/\//i.test(href)) return <>{children}</>;
  return (
    <a href={href} rel="noopener noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (opens external site)</span>
    </a>
  );
}
