import { test } from "node:test";
import assert from "node:assert/strict";
import { nextChoiceId } from "../lib/questions.js";

const ids = (...a) => a.map((id) => ({ id, text: "" }));

test("nextChoiceId: appends the next letter when nothing was deleted", () => {
  assert.equal(nextChoiceId(ids("a", "b")), "c");
  assert.equal(nextChoiceId([]), "a");
});

test("nextChoiceId: after deleting b from a,b,c the new choice is b, never a second c", () => {
  assert.equal(nextChoiceId(ids("a", "c")), "b");
  assert.equal(nextChoiceId(ids("b", "c")), "a");
});

test("nextChoiceId: stays unique past z", () => {
  const all = Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i));
  assert.equal(nextChoiceId(ids(...all)), "c26");
});

import { uniqueChoiceId } from "../lib/questions.js";

test("uniqueChoiceId: never repeats and never collides with the a, b, c... letters", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => uniqueChoiceId()));
  assert.equal(ids.size, 1000);
  assert.ok([...ids].every((id) => /^x[0-9a-z]+$/.test(id)));
});
