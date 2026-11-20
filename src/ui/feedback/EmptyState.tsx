import s from "./Notice.module.css";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className={s.empty}>{children}</div>;
}
