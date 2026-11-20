import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: { include: ["tests/unit/**/*.test.{ts,tsx}"], environment: "node" },
  resolve: {
    alias: [
      { find: /^@\//, replacement: here("./src/") },
      { find: /^server-only$/, replacement: here("./tests/unit/server-only-stub.ts") },
    ],
  },
});
