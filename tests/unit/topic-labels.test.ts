import { describe, expect, it } from "vitest";
import { topicLabel } from "@/data/adapters/topic-labels";

describe("topicLabel", () => {
  it.each([
    ["css", "CSS"],
    ["css/layout", "Layout"],
    ["css/color-and-typography", "Color and typography"],
    ["web-apis", "Web APIs"],
    ["javascript/language", "Language"],
    ["ai-tooling/agents", "Agents"],
    ["browsers-and-baseline", "Browsers and Baseline"],
    ["dom-and-events", "DOM and events"],
    ["media-and-images", "Media and images"],
  ])("%s → %s", (id, label) => expect(topicLabel(id)).toBe(label));
});
