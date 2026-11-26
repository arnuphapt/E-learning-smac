import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { STATE } from "./fixtures.mjs";

const CATALOG_PATH = path.resolve("public/dragon/generated/hatching/catalog.json");

test.describe("student dragon base (/s/dragon)", () => {
  test.use({ storageState: STATE.student });

  test("loads base, runs summon -> hatch -> feed -> mature loop, restricts species to S001-S003, expands flight bounds, and persists across reload", async ({
    page,
  }) => {
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    const allowedSpeciesIds = catalog.species
      .filter((s) => ["S001", "S002", "S003"].includes(s.region))
      .map((s) => s.id);
    expect(allowedSpeciesIds.length).toBeGreaterThan(0);

    const pageErrors = [];
    const consoleErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.clock.install();
    await page.goto("/s/dragon");

    await page.waitForFunction(() => Boolean(window.hatchBase && window.hatchery), null, {
      timeout: 30_000,
    });
    await expect(page.locator(".dragon-game .world canvas")).toBeVisible();
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    // Grant SC via wallet.devGrant so expansion chopping has enough coins.
    await page.evaluate(() => {
      window.hatchBase.wallet.devGrant("SC", 5000);
    });

    // Summon an egg and fast-forward through summon -> arrival -> incubation.
    await page.evaluate(() => {
      window.hatchery.summon();
    });
    await page.clock.fastForward(20_000);
    const readyStatus = await page.evaluate(() => window.hatchery.tick().active?.status);
    expect(readyStatus).toBe("ready");

    // Hatch the egg and fast-forward through hatch animation.
    await page.evaluate(() => {
      window.hatchery.hatch();
    });
    await page.clock.fastForward(5_000);
    const hatchedStatus = await page.evaluate(() => window.hatchery.tick().active?.status);
    expect(hatchedStatus).toBe("hatched");

    // Move hatched baby into its nursery slot.
    const babyId = await page.evaluate(() => {
      const slot = window.hatchery.getEmptySlots()[0];
      window.hatchery.move(slot?.GUID);
      return window.hatchery.tick().babies[0].id;
    });
    expect(babyId).toBeTruthy();

    // Feed baby through all stages until mature-ready, then mature into an adult.
    for (let step = 0; step < 8; step++) {
      const status = await page.evaluate((id) => {
        const snap = window.hatchery.tick();
        const baby = snap.babies.find((b) => b.id === id);
        return baby?.feeding?.status ?? null;
      }, babyId);
      if (status === "mature-ready") break;
      await page.evaluate((id) => {
        window.hatchery.feedBaby(id, window.hatchBase.wallet);
      }, babyId);
      await page.clock.fastForward(15_000);
    }

    const matureReady = await page.evaluate((id) => {
      const snap = window.hatchery.tick();
      return snap.babies.find((b) => b.id === id)?.feeding?.status;
    }, babyId);
    expect(matureReady).toBe("mature-ready");

    await page.evaluate((id) => {
      window.hatchery.matureBaby(id);
    }, babyId);
    await page.clock.fastForward(5_000);
    const adultCount = await page.evaluate(() => window.hatchery.tick().adults.length);
    expect(adultCount).toBeGreaterThanOrEqual(1);

    // Chop/open one active fog room and verify flight bounds grow.
    const expansionResult = await page.evaluate(() => {
      const exp = window.hatchBase.expansions;
      const bounds = window.hatchBase.movementBounds;
      const countOpenPoints = () => {
        let open = 0;
        for (let x = -50; x <= 75; x += 2.5) {
          for (let y = -55; y <= 0; y += 2.5) {
            if (bounds.contains({ x, y })) open++;
          }
        }
        return open;
      };

      const beforePoints = countOpenPoints();
      const snapBefore = exp.getSnapshot();
      const roomID = snapBefore.active[0];
      while (!exp.isRoomOpen(roomID)) {
        exp.chop(roomID, "SC");
      }
      const afterPoints = countOpenPoints();
      return {
        roomID,
        isOpen: exp.isRoomOpen(roomID),
        beforePoints,
        afterPoints,
      };
    });
    expect(expansionResult.isOpen).toBe(true);
    expect(expansionResult.afterPoints).toBeGreaterThan(expansionResult.beforePoints);

    // Reload and verify adult + opened expansion room persisted.
    await page.reload();
    await page.waitForFunction(() => Boolean(window.hatchBase && window.hatchery), null, {
      timeout: 30_000,
    });
    const persisted = await page.evaluate((roomID) => ({
      adults: window.hatchery.tick().adults.length,
      roomOpen: window.hatchBase.expansions.isRoomOpen(roomID),
    }), expansionResult.roomID);
    expect(persisted.adults).toBeGreaterThanOrEqual(1);
    expect(persisted.roomOpen).toBe(true);

    // Clear hatchery save and test 6 fresh summons across reloads, asserting all species are in S001-S003.
    const rolledSpecies = [];
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        localStorage.removeItem("dragon-base:hatchery:v2");
        localStorage.removeItem("dragon-base:hatchery:v1");
      });
      await page.reload();
      await page.waitForFunction(() => Boolean(window.hatchery), null, { timeout: 30_000 });
      const spId = await page.evaluate(() => window.hatchery.summon().speciesId);
      rolledSpecies.push(spId);
    }
    for (const spId of rolledSpecies) {
      expect(allowedSpeciesIds).toContain(spId);
    }
  });
});

test.describe("tutor-only user (/s/dragon)", () => {
  test.use({ storageState: STATE.guest });

  test("redirects tutor-only user away from /s/dragon", async ({ page }) => {
    await page.goto("/s/dragon");
    await expect(page).toHaveURL(/\/s\/tutor$/);
  });
});
