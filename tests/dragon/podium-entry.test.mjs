import test from "node:test";
import assert from "node:assert/strict";
import {
  PODIUM_ENTRY_TIMING,
  evaluatePodiumEntry,
} from "../../lib/dragon/podium-renderer.mjs";

const BASE = {
  restX: 100,
  restY: 180,
  slotWidth: 200,
  slotHeight: 140,
};

test("podium adult entry lands 3rd -> 2nd -> 1st within 3 seconds at exact resting position", () => {
  const { staggerSeconds, flySeconds, hoverSeconds } = PODIUM_ENTRY_TIMING;
  const total3 = flySeconds + hoverSeconds;
  const total2 = staggerSeconds + flySeconds + hoverSeconds;
  const total1 = 2 * staggerSeconds + flySeconds + hoverSeconds;

  assert.ok(total3 < total2 && total2 < total1, "order must be 3rd -> 2nd -> 1st");
  assert.ok(total1 <= 3, `total sequence (${total1}s) must be <= 3s`);

  // At t=0: 3rd is flying, 2nd and 1st are waiting (hidden)
  const s3Start = evaluatePodiumEntry({ ...BASE, place: 3, elapsedSeconds: 0.05 });
  const s2Wait = evaluatePodiumEntry({ ...BASE, place: 2, elapsedSeconds: 0.05 });
  const s1Wait = evaluatePodiumEntry({ ...BASE, place: 1, elapsedSeconds: 0.05 });
  assert.equal(s3Start.visible, true);
  assert.equal(s3Start.phase, "fly");
  assert.equal(s3Start.clipName, "Fly");
  assert.equal(s2Wait.visible, false);
  assert.equal(s2Wait.phase, "waiting");
  assert.equal(s1Wait.visible, false);
  assert.equal(s1Wait.phase, "waiting");

  // During hover for 3rd place
  const s3Hover = evaluatePodiumEntry({
    ...BASE,
    place: 3,
    elapsedSeconds: flySeconds + 0.1,
  });
  assert.equal(s3Hover.phase, "hover");
  assert.equal(s3Hover.clipName, "Hover");
  assert.ok(s3Hover.y < BASE.restY);

  // When 3rd has landed, 1st is still in flight/hover
  const s3Landed = evaluatePodiumEntry({
    ...BASE,
    place: 3,
    elapsedSeconds: total3 + 0.05,
  });
  const s1StillActive = evaluatePodiumEntry({
    ...BASE,
    place: 1,
    elapsedSeconds: total3 + 0.05,
  });
  assert.equal(s3Landed.phase, "idle");
  assert.equal(s3Landed.clipName, "Ground/Idle");
  assert.equal(s3Landed.x, BASE.restX);
  assert.equal(s3Landed.y, BASE.restY);
  assert.notEqual(s1StillActive.phase, "idle");

  // After total1, all three rest at exact (restX, restY) in Ground/Idle
  for (const place of [1, 2, 3]) {
    const rested = evaluatePodiumEntry({
      ...BASE,
      place,
      elapsedSeconds: total1 + 0.01,
    });
    assert.equal(rested.visible, true);
    assert.equal(rested.phase, "idle");
    assert.equal(rested.clipName, "Ground/Idle");
    assert.equal(rested.x, BASE.restX);
    assert.equal(rested.y, BASE.restY);
  }
});

test("reducedMotion skips flight and shows resting Ground/Idle immediately", () => {
  for (const place of [1, 2, 3]) {
    const state = evaluatePodiumEntry({
      ...BASE,
      place,
      elapsedSeconds: 0,
      reducedMotion: true,
    });
    assert.equal(state.visible, true);
    assert.equal(state.phase, "idle");
    assert.equal(state.clipName, "Ground/Idle");
    assert.equal(state.x, BASE.restX);
    assert.equal(state.y, BASE.restY);
  }
});
