import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "data"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["**/*.ts"],
      exclude: ["node_modules", "data", "**/*.test.ts", "**/__tests__/**", "vitest.config.ts"],
    },
  },
});
