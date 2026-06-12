import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Git worktrees and nested build output (e.g. .worktrees/build/.next):
    ".worktrees/**",
    "**/.next/**",
    // Design handoff artifacts, not app source:
    "design_handoff_live_redesign/**",
  ]),
]);

export default eslintConfig;
