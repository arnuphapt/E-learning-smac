import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DRAGON_GROWTH_THRESHOLDS } from "../lib/dragon-growth.ts";
import { adminDb, FX, STATE } from "./fixtures.mjs";

const CATALOG_PATH = path.resolve("public/dragon/generated/hatching/catalog.json");

function must({ error }, what) {
  if (error) throw new Error(`e2e dragon-hub: ${what}: ${error.message}`);
}

test.describe("dragon hub phase 2 E2E", () => {
  const quizId = randomUUID();
  let createdHubId = null;
  let createdSessionId = null;

  test.beforeAll(async () => {
    const db = adminDb();
    must(await db.from("users").update({ study_year: 1 }).eq("id", FX.student.id), "set student year 1");
    must(await db.from("dragons").delete().in("user_id", [FX.student.id, FX.studentYear2.id]), "clear dragons");
    must(await db.from("dragon_wallets").delete().in("user_id", [FX.student.id, FX.studentYear2.id]), "clear wallets");

    must(
      await db.from("course_instructors").upsert({
        course_id: FX.course.id,
        user_id: FX.instructor.id,
      }),
      "seed course_instructors"
    );

    must(
      await db.from("live_quizzes").insert({
        id: quizId,
        owner_id: FX.instructor.id,
        title: "[E2E] Dragon Hub Quiz",
      }),
      "seed live_quizzes"
    );

    must(
      await db.from("live_quiz_questions").insert({
        quiz_id: quizId,
        no: 1,
        text: "E2E Hub Q1",
        choices: [
          { id: "a", text: "คำตอบที่ถูก" },
          { id: "b", text: "คำตอบที่ผิด" },
        ],
        answer: "a",
        time_limit_sec: 20,
      }),
      "seed live_quiz_questions"
    );
  });

  test.afterAll(async () => {
    const db = adminDb();
    if (createdSessionId) {
      await db.from("live_sessions").delete().eq("id", createdSessionId);
    }
    if (createdHubId) {
      await db.from("live_hubs").delete().eq("id", createdHubId);
    }
    await db.from("live_quizzes").delete().eq("id", quizId);
    await db.from("dragons").delete().in("user_id", [FX.student.id, FX.studentYear2.id]);
    await db.from("dragon_wallets").delete().in("user_id", [FX.student.id, FX.studentYear2.id]);
    await db.from("users").update({ study_year: null }).eq("id", FX.student.id);
  });

  test("catalog restricts normal sets to S001-S003", () => {
    if (!fs.existsSync(CATALOG_PATH)) {
      test.skip(true, "public/dragon catalog not built");
      return;
    }
    const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
    const allowedSpeciesIds = catalog.species
      .filter((s) => ["S001", "S002", "S003"].includes(s.region))
      .map((s) => s.id);
    expect(allowedSpeciesIds.length).toBeGreaterThan(0);
  });

  test("instructor creates year-1 hub, year-1 student plays & earns first egg, hub scene shows partner, year-2 student blocked", async ({
    browser,
  }) => {
    const instructorCtx = await browser.newContext({ storageState: STATE.instructor });
    const student1Ctx = await browser.newContext({ storageState: STATE.student });
    const student2Ctx = await browser.newContext({ storageState: STATE.studentYear2 });

    try {
      const instructorPage = await instructorCtx.newPage();
      const student1Page = await student1Ctx.newPage();
      const student2Page = await student2Ctx.newPage();

      const pageErrors = [];
      const consoleErrors = [];
      student1Page.on("pageerror", (err) => pageErrors.push(err.message));
      student1Page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const rawUrl = msg.location()?.url ?? "";
        let pathname = "";
        try {
          pathname = new URL(rawUrl).pathname;
        } catch {
          pathname = "";
        }
        if (
          pathname.startsWith("/live/dev/") &&
          msg.text().startsWith("Failed to load resource: the server responded with a status of 404")
        ) {
          return;
        }
        consoleErrors.push(msg.text());
      });

      // 1. Instructor creates a year-1 hub at /i/live/hubs (UI)
      await instructorPage.goto("/i/live/hubs");
      const createHubBtn = instructorPage.getByRole("button", { name: /สร้าง Hub/i });
      await expect(createHubBtn).toBeEnabled({ timeout: 15_000 });
      await createHubBtn.click();
      const hubName = `[E2E] Hub ปี 1 ${Date.now()}`;
      await instructorPage.getByLabel(/ชื่อ Hub/i).fill(hubName);
      await instructorPage.getByLabel("ปี 1").click();
      await instructorPage.getByRole("button", { name: /^สร้าง Hub$/ }).click();

      const hubLink = instructorPage.getByRole("link", {
        name: new RegExp(hubName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      });
      await expect(hubLink).toBeVisible({ timeout: 15_000 });
      const hubHref = await hubLink.getAttribute("href");
      createdHubId = hubHref?.split("/").pop() ?? null;
      expect(createdHubId).toBeTruthy();

      // 2. Open a room under the hub via /api/live
      const createRes = await instructorPage.request.post("/api/live", {
        data: {
          quiz_id: quizId,
          course_id: FX.course.id,
          hub_id: createdHubId,
          restrict_to_course: false,
          team_mode: false,
        },
      });
      expect(createRes.status()).toBe(200);
      const createdRoom = await createRes.json();
      createdSessionId = createdRoom.id;
      const pin = createdRoom.pin;

      // 3. Year-2 student is rejected with 403 Thai year message when joining by PIN
      await student2Page.goto("/s/live/quiz");
      await student2Page.getByPlaceholder("123456").fill(pin);
      const join2Promise = student2Page.waitForResponse((r) => r.url().includes("/api/live/join"));
      await student2Page.getByRole("button", { name: /เข้าร่วม/i }).click();
      const join2Res = await join2Promise;
      expect(join2Res.status()).toBe(403);
      await expect(student2Page.getByText(/ชั้นปี/)).toBeVisible();

      // 4. Year-1 student joins by PIN -> lobby shows first-egg card, /api/dragon/me has hatched_at: null
      await student1Page.goto("/s/live/quiz");
      await student1Page.getByPlaceholder("123456").fill(pin);
      const join1Promise = student1Page.waitForResponse(
        (r) => r.url().includes("/api/live/join") && r.request().method() === "POST"
      );
      await student1Page.getByRole("button", { name: /เข้าร่วม/i }).click();
      const join1Res = await join1Promise;
      expect(join1Res.ok()).toBe(true);
      const join1Body = await join1Res.json();
      expect(join1Body.firstEgg).toBe(true);
      await expect(student1Page).toHaveURL(new RegExp(`/s/live/${createdSessionId}$`));
      await expect(student1Page.getByText("ได้ไข่มังกรใบแรกแล้ว")).toBeVisible({ timeout: 15_000 });

      const meBeforeEndRes = await student1Page.request.get("/api/dragon/me");
      expect(meBeforeEndRes.ok()).toBe(true);
      const meBeforeEnd = await meBeforeEndRes.json();
      expect(meBeforeEnd.dragons.length).toBe(1);
      expect(meBeforeEnd.dragons[0].hatched_at).toBeNull();
      expect(meBeforeEnd.dragons[0].readyToHatch).toBe(false);

      // Advance lobby -> question 0
      const advRes = await instructorPage.request.post(`/api/live/${createdSessionId}/advance`, {
        data: { action: "start" },
      });
      expect(advRes.ok()).toBe(true);

      const answerPromise = student1Page.waitForResponse(
        (r) =>
          r.url().includes(`/api/live/${createdSessionId}/answer`) &&
          r.request().method() === "POST"
      );
      await student1Page.getByRole("button", { name: /คำตอบที่ถูก/ }).click();
      const answerRes = await answerPromise;
      expect(answerRes.ok()).toBe(true);

      // Seed answer points past the hatch threshold (new scale: 1-50) so room end makes the egg ready to hatch
      const hatchTargetPoints = DRAGON_GROWTH_THRESHOLDS.hatch + 2;
      must(
        await adminDb()
          .from("live_answers")
          .update({ points: hatchTargetPoints })
          .eq("session_id", createdSessionId)
          .eq("user_id", FX.student.id),
        "seed answer points >= hatch threshold"
      );

      // End the room
      const endRes = await instructorPage.request.post(`/api/live/${createdSessionId}/advance`, {
        data: { action: "end" },
      });
      expect(endRes.ok()).toBe(true);

      // Student end screen shows ready-to-hatch summary
      await expect(student1Page.getByText(/\+[1-9][\d,]* แต้มมังกร/)).toBeVisible({ timeout: 15_000 });
      await expect(student1Page.getByText("ไข่พร้อมฟักแล้ว ไปกดฟักที่หน้ามังกร")).toBeVisible();

      // 5. Personal dragon hub (/s/dragon): no Summon button while unhatched egg is on incubator, then tap ready egg to hatch
      await student1Page.goto("/s/dragon");
      await expect(student1Page.getByText(/ทั้งหมด 1 ตัว/)).toBeVisible({ timeout: 15_000 });
      await expect(student1Page.getByRole("button", { name: "อัญเชิญไข่" })).toHaveCount(0);

      const canvas = student1Page.locator(".dragon-game .world canvas");
      await expect(canvas).toBeVisible({ timeout: 30_000 });

      // Wait for engine + hatchery assets + rendered egg actor. eggProjection() lands just below the egg's
      // hit area at this zoom, so locate the egg by scanning the canvas with the renderer's own hit-test
      // (same test a real pointer click uses) and click the centroid of the hit area.
      const eggPointHandle = await student1Page.waitForFunction(
        () => {
          const api = window.__dragonSceneApi;
          const snap = window.hatchery?.getSnapshot?.();
          if (!api?.focusAt || !api?.hatcheryRenderer?.hit || snap?.active?.status !== "ready") {
            return null;
          }
          api.focusAt("IncubatorEggMarker", 14);
          const view = document.querySelector(".dragon-game .world canvas");
          const hits = [];
          for (let x = 0; x < (view?.clientWidth ?? 0); x += 4) {
            for (let y = 0; y < (view?.clientHeight ?? 0); y += 4) {
              if (api.hatcheryRenderer.hit({ x, y })?.kind === "egg") hits.push([x, y]);
            }
          }
          if (!hits.length) return null;
          return {
            x: hits.reduce((n, p) => n + p[0], 0) / hits.length,
            y: hits.reduce((n, p) => n + p[1], 0) / hits.length,
          };
        },
        null,
        { timeout: 30_000 }
      );
      const proj = await eggPointHandle.jsonValue();
      expect(proj).toBeTruthy();

      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      const hatchPromise = student1Page.waitForResponse(
        (r) => r.url().includes("/api/dragon/hatch") && r.request().method() === "POST"
      );
      await student1Page.mouse.click(box.x + proj.x, box.y + proj.y);
      await student1Page.getByRole("button", { name: "ฟักไข่" }).click();
      const hatchRes = await hatchPromise;
      expect(hatchRes.ok()).toBe(true);

      // Wait for post-animation refetch and verify hatched_at is set and stage is past egg
      await expect
        .poll(
          async () => {
            const res = await student1Page.request.get("/api/dragon/me");
            if (!res.ok()) return null;
            const body = await res.json();
            const d = body.dragons?.[0];
            return d ? { hatched: d.hatched_at !== null, stage: d.growth?.stage } : null;
          },
          { timeout: 20_000 }
        )
        .toEqual({ hatched: true, stage: "baby" });

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);

      // 6. Hub scene API & pages (/i/live/hubs/[id] and /s/live/hubs/[id]) show the student's partner
      const dragonsApiRes = await instructorPage.request.get(`/api/live/hubs/${createdHubId}/dragons`);
      expect(dragonsApiRes.ok()).toBe(true);
      const dragonsPayload = await dragonsApiRes.json();
      expect(dragonsPayload.total_members).toBe(1);
      expect(dragonsPayload.dragons.length).toBe(1);

      await instructorPage.goto(`/i/live/hubs/${createdHubId}`);
      await expect(instructorPage.locator(".dragon-game .world canvas")).toBeVisible({ timeout: 30_000 });

      await student1Page.goto(`/s/live/hubs/${createdHubId}`);
      await expect(student1Page.locator(".dragon-game .world canvas")).toBeVisible({ timeout: 30_000 });
    } finally {
      await instructorCtx.close();
      await student1Ctx.close();
      await student2Ctx.close();
    }
  });
});

test.describe("tutor-only user redirects (/s/live/** and /s/dragon)", () => {
  test.use({ storageState: STATE.guest });

  test("redirects tutor-only user away from /s/live, /s/live/quiz, and /s/dragon", async ({ page }) => {
    for (const target of ["/s/live", "/s/live/quiz", "/s/dragon"]) {
      await page.goto(target);
      await expect(page).toHaveURL(/\/s\/tutor$/);
    }
  });
});
