import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    fileParallelism: false,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts", "../../packages/shared/src/**/*.ts", "../agent-client/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "src/test/**",
        "src/index.ts",
        "../agent-client/src/cli.ts",
        "../agent-client/src/demo.ts",
        "../agent-client/src/validate-real.ts"
      ],
      thresholds: {
        lines: 35,
        functions: 35,
        statements: 35,
        branches: 30
      }
    }
  },
  resolve: {
    alias: {
      "@agenticgate/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  }
});
