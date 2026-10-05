// Tutor-mode E2E. Runs against `next start` of the PRODUCTION build on a free port, with the real .env.local
// (the only database is production: see e2e/fixtures.mjs for the fx_e2e_ row rules).
//   npm run build && npm run test:e2e
import fs from "node:fs";
import net from "node:net";
import { defineConfig, devices } from "@playwright/test";

if (!fs.existsSync(".next/BUILD_ID")) throw new Error("No production build: run `npm run build` before `npm run test:e2e`.");

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

// Picked once in the runner process; the workers inherit it through the environment.
const port = Number(process.env.E2E_PORT) || (await freePort());
process.env.E2E_PORT = String(port);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  timeout: 90_000, // the AI summary / explain tests call Gemini
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.mjs",
  globalTeardown: "./e2e/global-teardown.mjs",
  use: { baseURL, trace: "retain-on-failure", locale: "th-TH" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: { NEXTAUTH_URL: baseURL },
  },
});
