import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    maxWorkers: 1,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/**/types.ts",
        "src/**/index.ts",
        "src/mirror/generated/**",
        "src/react/context.tsx",
        "src/react/provider.tsx",
        "src/react/hooks.ts",
        "src/scheduled/sdk-adapter.ts"
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
