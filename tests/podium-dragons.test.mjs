import assert from "node:assert/strict";
import test from "node:test";
import { attachPodiumDragons } from "../lib/podium-dragons.ts";

test("attachPodiumDragons maps partner dragon stage for egg, baby, and adult", () => {
  const players = [
    { userId: "u1", name: "Alice", score: 300, rank: 1 },
    { userId: "u2", name: "Bob", score: 200, rank: 2 },
    { userId: "u3", name: "Cara", score: 100, rank: 3 },
  ];

  const rows = [
    // Unhatched egg even with >= 10 points
    { user_id: "u1", species_id: "001", points: 15, hatched_at: null },
    // Hatched baby (10..49)
    { user_id: "u2", species_id: "003", points: 25, hatched_at: "2026-11-20T00:00:00Z" },
    // Hatched adult (>= 50)
    { user_id: "u3", species_id: "008", points: 50, hatched_at: "2026-11-19T00:00:00Z" },
  ];

  const result = attachPodiumDragons(players, rows);
  assert.equal(result.length, 3);
  assert.equal(result[0].dragon?.species_id, "001");
  assert.equal(result[0].dragon?.growth.stage, "egg");
  assert.equal(result[1].dragon?.species_id, "003");
  assert.equal(result[1].dragon?.growth.stage, "baby");
  assert.equal(result[2].dragon?.species_id, "008");
  assert.equal(result[2].dragon?.growth.stage, "adult");
});

test("attachPodiumDragons returns null when partner dragon or userId is missing", () => {
  const players = [
    { userId: "u-no-dragon", name: "NoDragon", score: 100, rank: 1 },
    { name: "TeamAlpha", score: 90, rank: 2 },
  ];

  const result = attachPodiumDragons(players, []);
  assert.equal(result[0].dragon, null);
  assert.equal(result[1].dragon, null);
});
