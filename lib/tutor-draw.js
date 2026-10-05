// Pure draw for a tutor attempt: which bank questions go into a round, and in what order.
// No imports: safe for server, client and node --test. Randomness is injected (rng returns [0, 1)) so tests are deterministic.

// Fisher-Yates on a copy.
export function shuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Questions in one round: the draw count (null / undefined = whole bank), never more than the bank has.
export const roundSize = (bankSize, count = null) => (count == null ? bankSize : Math.max(0, Math.min(count, bankSize)));

// bank:   [{ id, topic_id }]  every tutor question of the lesson (topic_id null = no topic)
// count:  questions per round; null / undefined = use the whole bank. Never more than the bank has (small bank = whole bank).
// recent: ids the student saw in recent rounds (any iterable)
// Returns the chosen question ids in the order the student will see them.
//
// Topic quota: topics are served round-robin, so the picks differ by at most 1 between topics that still have
// questions; a topic that runs out hands its share to the others. Questions without a topic form one group of their
// own (so a lesson with no topics at all is a single group = plain random). Inside a topic, questions the student has
// not seen recently come first (random order), seen ones only after those are used up.
// ponytail: topic balance outranks freshness, deliberately: a topic with only recently seen questions still gets its turn
// while another topic has unseen ones left. The topic analysis (ticket 05) needs every topic covered in every round.
// Pinned by a test in tests/tutor-draw.test.mjs. Revisit only if a teacher asks for "fresh first, across topics".
export function drawQuestions({ bank, count = null, recent = [], rng = Math.random }) {
  const seen = new Set(recent);
  const n = roundSize(bank.length, count);

  const groups = new Map();
  for (const q of bank) {
    const key = q.topic_id ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }
  // random group order, so the remainder of an uneven split does not always go to the same topic
  const queues = shuffle([...groups.values()], rng).map((qs) => [
    ...shuffle(qs.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(qs.filter((q) => seen.has(q.id)), rng),
  ]);

  const picked = [];
  for (let round = 0; picked.length < n; round++) {
    let took = false;
    for (const queue of queues) {
      if (picked.length >= n) break;
      if (round < queue.length) {
        picked.push(queue[round].id);
        took = true;
      }
    }
    if (!took) break;
  }
  return shuffle(picked, rng); // mix the topics up for display
}
