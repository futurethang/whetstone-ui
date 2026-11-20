import s from "./Entry.module.css";

/** A section whose body is a <details> on narrow screens and always open on wide ones (see Entry.module.css). */
export function Collapsible({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className={s.section} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      <details className={s.collapse}>
        <summary>Show {title.toLowerCase()}</summary>
        {children}
      </details>
    </section>
  );
}
