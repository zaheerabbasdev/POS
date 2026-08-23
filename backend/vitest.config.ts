import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Multi-tenancy/integration tests hit a real Postgres database and run
    // real HTTP requests through the Express app — not fast unit tests.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // These tests create/read/delete real rows (isolated by randomly-suffixed
    // shop/user names, cleaned up in afterAll) — running them concurrently
    // against the same database risks cross-test interference, so keep
    // suites sequential rather than parallelized.
    fileParallelism: false,
  },
});
