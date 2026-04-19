import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Many backend tests swap DATA_DIR and other process env values at runtime.
    // Running files in parallel makes those globals race across suites.
    fileParallelism: false,
  },
});
