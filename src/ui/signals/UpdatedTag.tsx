import s from "./Signals.module.css";

/** Accent dot + "Updated" or "New" since the last visit. */
export function UpdatedTag({ kind }: { kind: "new" | "updated" }) {
  return (
    <span className={`${s.signal} ${s.updated}`}>
      <span className={s.dot} aria-hidden="true" />
      {kind === "new" ? "New" : "Updated"}
      <span className="visually-hidden"> since your last visit</span>
    </span>
  );
}
