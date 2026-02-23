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
        // 実測値(2026-02-23): Lines 70.23%, Branches 58.49%, Functions 69.44%
        // 段階的引き上げ: 16→64→66→70（達成済み）→ 80% → 90%
        lines: 70,
        branches: 58,
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
