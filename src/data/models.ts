/**
 * View models the UI uses. Owned by this repo; pages never see raw API shapes.
 * Kept free of React so the data module can be reused by another presentation.
 */

/** Who the data is for. Always "owner" in V1; a public presentation would drop owner-only fields here. */
export type Audience = "owner" | "public";

export type Topic = {
  id: string;
  label: string;
  parentId: string | null;
  depth: number;
  entryCount: number;
  staleCount: number;
  countsByStatus: Record<string, number>;
  reviewIntervalDays: number;
};
