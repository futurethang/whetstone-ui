/**
 * Raw response shapes from the data API (futurethang/whetstone, SPEC §12.3), validated at runtime in client.ts.
 * Objects strip unknown fields (the API may add fields within schema 1). Enum-like values are plain strings
 * so a new value from the API reaches the UI's `unknown` fallback instead of failing validation.
 * Schemas are added per milestone as pages start using each endpoint.
 */
import { z } from "zod";

const envelope = { schema: z.literal(1), generated_at: z.string() };

export const TopicsResponse = z.object({
  ...envelope,
  topics: z.array(
    z.object({
      id: z.string(),
      parent: z.string().nullable(),
      review_interval: z.string(),
      review_interval_days: z.number(),
      entries: z.number().int(),
      by_status: z.record(z.string(), z.number().int()),
      stale: z.number().int(),
    }),
  ),
});
export type TopicsResponse = z.infer<typeof TopicsResponse>;
