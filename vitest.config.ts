import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", ".next", "out", "build", ".claude/worktrees/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["app/api/**/*.ts", "lib/**/*.ts"],
      exclude: [
        "lib/__tests__/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "e2e/**",
        "load-tests/**",
      ],
      thresholds: {
        // 実測値(2026-03-13): Lines 69.26%, Branches 57.81%, Functions 71.34%
        // Phase 1+2 (Redis+SSR) でfriends-list/route.tsに分岐が増加
        lines: 69,
        branches: 57,
        functions: 69,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
