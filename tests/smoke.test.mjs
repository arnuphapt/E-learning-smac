import { test } from "node:test";
import assert from "node:assert/strict";

// Harness smoke test: proves `npm test` (node --test) runs. Real tests (draw, grading, deadline) come with later tutor-mode tickets.
test("node --test harness runs", () => {
  assert.equal(1 + 1, 2);
});
