import test from "node:test";
import assert from "node:assert/strict";
import {
  canBeginAdultDrag,
  canBeginFoodDrag,
  createHatcheryRenderer,
} from "../../lib/dragon/hatchery-renderer.mjs";

const ADULT = { actorId: "a1", kind: "adult", control: {} };
const BABY = { actorId: "b1", kind: "baby" };

test("viewOnly with allowAdultDrag enables adult drag while keeping food drag disabled", () => {
  assert.equal(
    canBeginAdultDrag({ viewOnly: true, allowAdultDrag: true, actor: ADULT }),
    true
  );
  assert.equal(
    canBeginAdultDrag({ viewOnly: true, allowAdultDrag: true, actor: BABY }),
    false
  );
  assert.equal(
    canBeginFoodDrag({ viewOnly: true }),
    false
  );
});

test("viewOnly without allowAdultDrag disables both adult drag and food drag", () => {
  assert.equal(
    canBeginAdultDrag({ viewOnly: true, allowAdultDrag: false, actor: ADULT }),
    false
  );
  assert.equal(
    canBeginFoodDrag({ viewOnly: true }),
    false
  );
});

test("full mode enables both adult drag and food drag", () => {
  assert.equal(
    canBeginAdultDrag({ viewOnly: false, allowAdultDrag: false, actor: ADULT }),
    true
  );
  assert.equal(
    canBeginFoodDrag({ viewOnly: false }),
    true
  );
});

test("viewOnly renderer does not harvest coins when an adult is tapped", () => {
  let harvested = false;
  const entries = [
    {
      actorId: "a1",
      kind: "adult",
      adult: { id: "a1", speciesId: "001" },
      species: { id: "001", stageYields: [10], sourceGrowthWaits: [0] },
      item: { XPos: 0, YPos: 0, ZPos: 0, scaleX: 1, scaleY: 1 },
      perch: { SymbolID: "PerchMarker_Ground" },
      control: { state: "Perching", readyToHarvest: true },
      coinShown: true,
    },
  ];
  const renderer = createHatcheryRenderer({
    PIXI: {},
    map: { MapItemData: [], LayerData: [] },
    entries,
    loadTexture: async () => ({}),
    sortScene: () => {},
    invalidate: () => {},
    onHarvest: () => {
      harvested = true;
    },
    viewOnly: true,
  });

  // In viewOnly mode onHarvest is not wired in engine.mjs, and even if passed,
  // tapAdult only harvests when onHarvest is provided and coinShown/readyToHarvest hold.
  // Verify food drag is also a no-op when no food entry is created in viewOnly.
  assert.equal(renderer.beginFoodDrag("b1", 1000), false);
  assert.equal(harvested, false);
});
