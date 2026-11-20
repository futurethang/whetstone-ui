/** Wrap query terms in <mark>. Terms shorter than 2 characters are ignored; matching is case-insensitive. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = [...new Set(query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2))];
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}
