import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

/** The data API boundary: only src/data/client.ts may call fetch (spec, "Rules for the boundary"). */
const FETCH_ONLY_IN_CLIENT = {
  name: "fetch",
  message: "Only src/data/client.ts talks to the data API. Add a function in src/data/ and call that instead.",
};

export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "test-results/**", "playwright-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Plain <a> keeps navigation working without JavaScript and avoids prefetching protected pages.
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "no-restricted-globals": ["error", FETCH_ONLY_IN_CLIENT],
      "no-restricted-properties": [
        "error",
        { object: "globalThis", property: "fetch", message: FETCH_ONLY_IN_CLIENT.message },
        { object: "window", property: "fetch", message: FETCH_ONLY_IN_CLIENT.message },
      ],
      // CSP has no 'unsafe-inline' for styles, so inline style attributes would be blocked in the browser.
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='style']", message: "No inline styles (CSP). Use a CSS Module class or a custom property." },
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Render sanitised HTML only through the markdown pipeline in src/data." },
      ],
    },
  },
  {
    // Pages and components use data functions and view models, never the raw client or API shapes.
    files: ["app/**/*.{ts,tsx}", "src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/data/api-types", "**/data/api-types"], message: "Use view models from @/data/models." },
            { group: ["@/data/adapters/*", "**/data/adapters/*"], message: "Adapters run inside src/data; pages receive their results." },
          ],
          paths: [{ name: "@/data/client", importNames: ["apiGet", "apiGetOrNull", "buildUrl"], message: "Call a function from src/data/<resource>.ts instead." }],
        },
      ],
    },
  },
  {
    // The data module stays free of React and Next.js so another presentation can reuse it.
    files: ["src/data/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["react", "react-dom", "react/*", "next", "next/*", "@/ui/*"], message: "src/data must not depend on React, Next.js or UI code." }] }],
    },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly", URL: "readonly" } },
  },
  {
    files: ["src/data/client.ts", "src/auth/github.ts", "tests/**/*.ts", "playwright.config.ts"],
    rules: { "no-restricted-globals": "off", "no-restricted-properties": "off" },
  },
);
