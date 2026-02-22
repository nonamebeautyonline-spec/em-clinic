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
        // 段階的引き上げ: 14% → 20% → 40% → 70% → 90%
        lines: 14,
        branches: 10,
        functions: 17,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
