/**
 * V1: the API's `stale` flag plus the primary topic's review interval give a due date.
 * V2 replacement: `review_due_at` from the API.
 */
import type { Staleness } from "../models";
import { addDays, daysBetween, todayIso } from "./dates";

export function staleness(args: { stale: boolean; lastReviewed: string; intervalDays: number | undefined; today?: string }): Staleness {
  const interval = args.intervalDays && args.intervalDays > 0 ? args.intervalDays : 365;
  const dueDate = addDays(args.lastReviewed, interval);
  const today = args.today ?? todayIso();
  return { stale: args.stale, dueDate, overdueDays: args.stale ? Math.max(0, daysBetween(dueDate, today)) : 0 };
}
