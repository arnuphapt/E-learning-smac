import test from "node:test";
import assert from "node:assert/strict";
import {
  pickPartnerChoiceIndex,
  resolveAdultPartner,
} from "../../lib/quiz-partner-dragon.ts";

test("resolveAdultPartner returns speciesId+isPartner only for adult partners", () => {
  assert.equal(resolveAdultPartner(null), null);
  assert.equal(resolveAdultPartner([]), null);

  // Egg or baby partner -> nothing shown
  assert.equal(
    resolveAdultPartner([
      { species_id: "001", is_partner: true, growth: { stage: "egg" } },
    ]),
    null
  );
  assert.equal(
    resolveAdultPartner([
      { species_id: "001", is_partner: true, growth: { stage: "baby" } },
    ]),
    null
  );

  // Non-partner adult -> nothing shown
  assert.equal(
    resolveAdultPartner([
      { species_id: "001", is_partner: false, growth: { stage: "adult" } },
    ]),
    null
  );

  // Adult partner -> returned
  assert.deepEqual(
    resolveAdultPartner([
      { species_id: "001", is_partner: false, growth: { stage: "adult" } },
      { species_id: "003", is_partner: true, growth: { stage: "adult" } },
    ]),
    { speciesId: "003", isPartner: true }
  );
});

test("pickPartnerChoiceIndex is deterministic per questionIndex and valid for 2-4 choices", () => {
  for (const choiceCount of [2, 3, 4]) {
    const seen = new Set();
    for (let q = 0; q < 20; q++) {
      const first = pickPartnerChoiceIndex(q, choiceCount, "room-1");
      const second = pickPartnerChoiceIndex(q, choiceCount, "room-1");
      assert.equal(first, second, "same questionIndex must not jump on re-render");
      assert.ok(
        Number.isInteger(first) && first >= 0 && first < choiceCount,
        `index ${first} out of bounds for ${choiceCount} choices`
      );
      seen.add(first);
    }
    assert.ok(seen.size >= 2, `should vary across questions for ${choiceCount} choices`);
  }

  assert.equal(pickPartnerChoiceIndex(0, 0), -1);
});
