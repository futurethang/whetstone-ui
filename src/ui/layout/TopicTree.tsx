import type { TopicNode } from "@/data/models";
import s from "./TopicTree.module.css";

function Branch({ nodes, current }: { nodes: TopicNode[]; current: string | null }) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.id}>
          <a href={`/t/${n.id}`} aria-current={n.id === current ? "page" : undefined}>
            {n.label}
          </a>
          {n.children.length ? <Branch nodes={n.children} current={current} /> : null}
        </li>
      ))}
    </ul>
  );
}

/** Topic navigation: a side column on wide screens, above content on narrow ones (layout decides). */
export function TopicTree({ tree, current }: { tree: TopicNode[]; current: string | null }) {
  return (
    <nav aria-label="Topics" className={s.tree}>
      <h2>Topics</h2>
      <Branch nodes={tree} current={current} />
    </nav>
  );
}
