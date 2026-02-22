import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", ".next", "out", "build"],
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
        // 実測値(2026-02-22): Lines 15.9%, Branches 12%, Functions 18.59%
        // 段階的引き上げ: 現在値 → 25% → 40% → 70% → 90%
        lines: 15,
        branches: 11,
        functions: 18,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
