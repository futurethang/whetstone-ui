/** First sentence of a verdict, for compact rows. Splits at ". " followed by a capital or an opening bracket. */
export function verdictLead(verdict: string): string {
  const v = verdict.trim();
  const m = /^(.+?[.!?])\s+(?=[A-Z(“"])/.exec(v);
  return m ? m[1]! : v;
}
