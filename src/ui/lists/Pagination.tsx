import s from "./Pagination.module.css";

/** Previous / numbered / next links. Works without JavaScript. */
export function Pagination({ page, pageCount, href, label = "Pagination" }: { page: number; pageCount: number; href: (page: number) => string; label?: string }) {
  if (pageCount <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount].filter((n) => n >= 1 && n <= pageCount))].sort((a, b) => a - b);
  return (
    <nav aria-label={label} className={s.pager}>
      <ul>
        {page > 1 ? (
          <li>
            <a href={href(page - 1)} rel="prev">
              Previous
            </a>
          </li>
        ) : null}
        {pages.map((n, i) => (
          <li key={n}>
            {i > 0 && n - pages[i - 1]! > 1 ? <span aria-hidden="true">…</span> : null}
            <a href={href(n)} aria-current={n === page ? "page" : undefined}>
              <span className="visually-hidden">Page </span>
              {n}
            </a>
          </li>
        ))}
        {page < pageCount ? (
          <li>
            <a href={href(page + 1)} rel="next">
              Next
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
