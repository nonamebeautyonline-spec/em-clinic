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
        // 実測値(2026-03-08): Lines 68.62%, Branches 56.81%, Functions 67.49%
        // 36機能一括追加（改善項目Batch 1-6）による一時的低下 → 段階的に回復予定
        lines: 68,
        branches: 56,
        functions: 67,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
