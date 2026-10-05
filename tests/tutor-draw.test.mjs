import { test } from "node:test";
import assert from "node:assert/strict";
import { drawQuestions, shuffle, roundSize } from "../lib/tutor-draw.js";
import { minutesFor, deadlineFor, isPastDeadline, firstUnansweredIndex } from "../lib/tutor-attempt.js";

// mulberry32: small seeded RNG so every run is the same
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const topicBank = (sizes) =>
  sizes.flatMap((size, t) => Array.from({ length: size }, (_, i) => ({ id: `t${t}q${i}`, topic_id: `topic${t}` })));
const byTopic = (bank, ids) => {
  const topicOf = Object.fromEntries(bank.map((q) => [q.id, q.topic_id]));
  const counts = {};
  for (const id of ids) counts[topicOf[id]] = (counts[topicOf[id]] || 0) + 1;
  return counts;
};

test("topic quota is spread evenly (differs by at most 1)", () => {
  const bank = topicBank([10, 10, 10]);
  for (let seed = 1; seed <= 30; seed++) {
    const even = byTopic(bank, drawQuestions({ bank, count: 9, rng: seeded(seed) }));
    assert.deepEqual(Object.values(even), [3, 3, 3]);
    const odd = Object.values(byTopic(bank, drawQuestions({ bank, count: 10, rng: seeded(seed) }))).sort();
    assert.deepEqual(odd, [3, 3, 4]);
  }
});

test("the odd question out does not always go to the same topic", () => {
  const bank = topicBank([10, 10, 10]);
  const winners = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const counts = byTopic(bank, drawQuestions({ bank, count: 10, rng: seeded(seed) }));
    winners.add(Object.keys(counts).find((k) => counts[k] === 4));
  }
  assert.equal(winners.size, 3);
});

test("a topic with few questions hands its share to the others, and still appears", () => {
  const bank = topicBank([2, 20, 20]);
  const counts = byTopic(bank, drawQuestions({ bank, count: 12, rng: seeded(7) }));
  assert.equal(counts.topic0, 2);
  assert.equal(counts.topic1 + counts.topic2, 10);
  assert.equal(counts.topic1, 5);
});

test("avoids recently seen questions when the bank has enough left (no topics)", () => {
  const bank = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, topic_id: null }));
  const recent = ["q0", "q1", "q2", "q3"];
  for (let seed = 1; seed <= 20; seed++) {
    const ids = drawQuestions({ bank, count: 6, recent, rng: seeded(seed) });
    assert.equal(ids.length, 6);
    assert.ok(ids.every((id) => !recent.includes(id)), "no seen question while 6 unseen remain");
  }
});

test("avoids recently seen questions inside each topic", () => {
  const bank = topicBank([6, 6]);
  const recent = ["t0q0", "t0q1", "t1q0", "t1q1"];
  const ids = drawQuestions({ bank, count: 8, recent, rng: seeded(3) });
  assert.equal(ids.length, 8);
  assert.ok(ids.every((id) => !recent.includes(id)));
});

test("not enough unseen questions: all unseen are used, the rest filled from seen", () => {
  const bank = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, topic_id: null }));
  const recent = ["q0", "q1", "q2", "q3"];
  const ids = drawQuestions({ bank, count: 8, recent, rng: seeded(5) });
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, 8);
  for (const id of ["q4", "q5", "q6", "q7", "q8", "q9"]) assert.ok(ids.includes(id), id + " unseen must be drawn");
  assert.equal(ids.filter((id) => recent.includes(id)).length, 2);
});

test("small bank: asking for more than the bank has returns the whole bank once", () => {
  const bank = topicBank([2, 2]);
  const ids = drawQuestions({ bank, count: 10, rng: seeded(9) });
  assert.deepEqual([...ids].sort(), bank.map((q) => q.id).sort());
});

test("empty bank draws nothing", () => {
  assert.deepEqual(drawQuestions({ bank: [], count: 5 }), []);
  assert.deepEqual(drawQuestions({ bank: [], count: null }), []);
});

test("count NULL uses the whole bank, even with seen questions", () => {
  const bank = topicBank([3, 4, 5]);
  const ids = drawQuestions({ bank, count: null, recent: ["t0q0", "t1q1"], rng: seeded(11) });
  assert.deepEqual([...ids].sort(), bank.map((q) => q.id).sort());
});

test("lesson with no topics at all is a plain random draw", () => {
  const bank = Array.from({ length: 8 }, (_, i) => ({ id: `q${i}`, topic_id: null }));
  const ids = drawQuestions({ bank, count: 5, rng: seeded(2) });
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  assert.ok(ids.every((id) => bank.some((q) => q.id === id)));
});

test("topic balance beats cross-topic freshness: topic A fully seen still gets its share (deliberate, ticket 05 needs every topic covered)", () => {
  const bank = topicBank([5, 5]);
  const recent = bank.filter((q) => q.topic_id === "topic0").map((q) => q.id);
  for (let seed = 1; seed <= 20; seed++) {
    const counts = byTopic(bank, drawQuestions({ bank, count: 4, recent, rng: seeded(seed) }));
    assert.deepEqual(counts, { topic0: 2, topic1: 2 });
  }
});

test("questions without a topic form their own group next to real topics", () => {
  const bank = [...topicBank([5]), ...Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, topic_id: null }))];
  const ids = drawQuestions({ bank, count: 6, rng: seeded(4) });
  assert.equal(ids.filter((id) => id.startsWith("n")).length, 3);
  assert.equal(ids.filter((id) => id.startsWith("t")).length, 3);
});

test("deterministic for the same rng, different otherwise, input untouched, order is shuffled", () => {
  const bank = topicBank([8, 8, 8]);
  const snapshot = JSON.stringify(bank);
  const a = drawQuestions({ bank, count: 12, rng: seeded(42) });
  const b = drawQuestions({ bank, count: 12, rng: seeded(42) });
  const c = drawQuestions({ bank, count: 12, rng: seeded(43) });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(JSON.stringify(bank), snapshot);
  // not grouped by topic: some seed must produce a topic change that is not just 3 blocks of 4
  const blocks = (ids) => ids.filter((id, i) => i > 0 && id[1] !== ids[i - 1][1]).length;
  assert.ok(Array.from({ length: 10 }, (_, s) => blocks(drawQuestions({ bank, count: 12, rng: seeded(s + 100) }))).some((x) => x > 2));
});

test("round size: draw count capped by the bank, NULL = whole bank", () => {
  assert.equal(roundSize(30, 10), 10);
  assert.equal(roundSize(4, 10), 4);
  assert.equal(roundSize(30, null), 30);
  assert.equal(roundSize(30), 30);
  assert.equal(roundSize(0, 5), 0);
});

test("shuffle keeps all items", () => {
  const items = [1, 2, 3, 4, 5];
  assert.deepEqual([...shuffle(items, seeded(1))].sort(), items);
  assert.deepEqual(items, [1, 2, 3, 4, 5]);
});

test("deadline: 1 minute per question from the server clock", () => {
  assert.equal(minutesFor(20), 20);
  const start = Date.parse("2026-10-06T10:00:00.000Z");
  assert.equal(deadlineFor(start, 20), "2026-10-06T10:20:00.000Z");
  assert.equal(deadlineFor(start, 1), "2026-10-06T10:01:00.000Z");
});

test("past deadline: at or after deadline_at counts as ended, never extended", () => {
  const dl = "2026-10-06T10:20:00.000Z";
  const dlMs = Date.parse(dl);
  assert.equal(isPastDeadline(dl, dlMs - 1), false);
  assert.equal(isPastDeadline(dl, dlMs), true);
  assert.equal(isPastDeadline(dl, dlMs + 60_000), true);
});

test("resume lands on the first unanswered question in the locked order", () => {
  const ids = ["b", "a", "c", "d"];
  assert.equal(firstUnansweredIndex(ids, {}), 0);
  assert.equal(firstUnansweredIndex(ids, { b: "x", a: "y" }), 2);
  assert.equal(firstUnansweredIndex(ids, { b: "x", c: "y" }), 1);
  assert.equal(firstUnansweredIndex(ids, { a: "1", b: "2", c: "3", d: "4" }), 0);
});
