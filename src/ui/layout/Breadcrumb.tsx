import s from "./Breadcrumb.module.css";

export type Crumb = { href: string; label: string };

/** Ancestors as links; the current page (if given) is marked aria-current. */
export function Breadcrumb({ items, current }: { items: Crumb[]; current?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={s.crumbs}>
      <ol>
        {items.map((c) => (
          <li key={c.href}>
            <a href={c.href}>{c.label}</a>
          </li>
        ))}
        {current ? <li aria-current="page">{current}</li> : null}
      </ol>
    </nav>
  );
}
