// Isolated UI checks: no database fixture setup, teardown, or saved authentication state.
// Run: npx playwright test -c playwright.materials.config.mjs
import { defineConfig } from "@playwright/test"
import base from "./playwright.config.mjs"

export default defineConfig({
  ...base,
  testMatch: "lesson-materials.spec.mjs",
  globalSetup: undefined,
  globalTeardown: undefined,
  timeout: 30_000,
  use: { ...base.use, trace: "off", actionTimeout: 10_000 },
})
