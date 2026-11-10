import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LIVE_ASSETS } from '../lib/live-assets.js';
import {
  TIME_LIMITS,
  PHASES,
  TRANSITIONS,
  GRACE_MS,
  TEAM_NAMES,
  validateQuiz,
  nextPhase,
  scorePoints,
  rankRows,
  isLate,
  teamScore,
  pickTeam,
  genPin,
} from '../lib/live.js';

describe('Live Quiz Core Lib', () => {
  describe('validateQuiz', () => {
    it('rejects when there are no questions', () => {
      const resEmpty = validateQuiz([]);
      assert.equal(resEmpty.ok, false);
      assert.ok(resEmpty.problems.length > 0);

      const resNull = validateQuiz(null);
      assert.equal(resNull.ok, false);
      assert.ok(resNull.problems.length > 0);
    });

    it('rejects empty question text', () => {
      const res = validateQuiz([
        {
          text: '   ',
          choices: [
            { id: 'a', text: 'ตัวเลือก 1' },
            { id: 'b', text: 'ตัวเลือก 2' },
          ],
          answer: 'a',
          time_limit_sec: 20,
        },
      ]);
      assert.equal(res.ok, false);
      assert.ok(res.problems.some((p) => p.reason.includes('ข้อความ')));
    });

    it('rejects when choices are fewer than 2 or more than 4', () => {
      const res1 = validateQuiz([
        {
          text: 'คำถาม 1',
          choices: [{ id: 'a', text: 'ข้อ 1' }],
          answer: 'a',
          time_limit_sec: 20,
        },
      ]);
      assert.equal(res1.ok, false);

      const res5 = validateQuiz([
        {
          text: 'คำถาม 1',
          choices: [
            { id: 'a', text: 'ข้อ 1' },
            { id: 'b', text: 'ข้อ 2' },
            { id: 'c', text: 'ข้อ 3' },
            { id: 'd', text: 'ข้อ 4' },
            { id: 'e', text: 'ข้อ 5' },
          ],
          answer: 'a',
          time_limit_sec: 20,
        },
      ]);
      assert.equal(res5.ok, false);
    });

    it('rejects empty choice text', () => {
      const res = validateQuiz([
        {
          text: 'คำถาม 1',
          choices: [
            { id: 'a', text: 'ข้อ 1' },
            { id: 'b', text: '' },
          ],
          answer: 'a',
          time_limit_sec: 20,
        },
      ]);
      assert.equal(res.ok, false);
      assert.ok(res.problems.some((p) => p.reason.includes('ตัวเลือก')));
    });

    it('rejects when answer is missing or not in choices', () => {
      const resMissing = validateQuiz([
        {
          text: 'คำถาม 1',
          choices: [
            { id: 'a', text: 'ข้อ 1' },
            { id: 'b', text: 'ข้อ 2' },
          ],
          answer: '',
          time_limit_sec: 20,
        },
      ]);
      assert.equal(resMissing.ok, false);

      const resNotInChoices = validateQuiz([
        {
          text: 'คำถาม 1',
          choices: [
            { id: 'a', text: 'ข้อ 1' },
            { id: 'b', text: 'ข้อ 2' },
          ],
          answer: 'c',
          time_limit_sec: 20,
        },
      ]);
      assert.equal(resNotInChoices.ok, false);
    });

    it('rejects bad time limit', () => {
      const res = validateQuiz([
        {
          text: 'คำถาม 1',
          choices: [
            { id: 'a', text: 'ข้อ 1' },
            { id: 'b', text: 'ข้อ 2' },
          ],
          answer: 'a',
          time_limit_sec: 15, // not in TIME_LIMITS
        },
      ]);
      assert.equal(res.ok, false);
      assert.ok(res.problems.some((p) => p.reason.includes('เวลา')));
    });

    it('passes a valid quiz with valid choices and time limits', () => {
      const res = validateQuiz([
        {
          text: '2 + 2 = ?',
          choices: [
            { id: 'a', text: '3' },
            { id: 'b', text: '4' },
            { id: 'c', text: '5' },
          ],
          answer: 'b',
          time_limit_sec: 20,
        },
        {
          text: 'พระอาทิตย์ขึ้นทิศไหน?',
          choices: [
            { id: 'a', text: 'ตะวันออก' },
            { id: 'b', text: 'ตะวันตก' },
          ],
          answer: 'a',
          time_limit_sec: 10,
        },
      ]);
      assert.equal(res.ok, true);
      assert.equal(res.problems.length, 0);
    });
  });

  describe('scorePoints', () => {
    it('returns 0 when answer is wrong', () => {
      assert.equal(scorePoints({ elapsedMs: 0, limitSec: 20, correct: false }), 0);
      assert.equal(scorePoints({ elapsedMs: 5000, limitSec: 20, correct: false }), 0);
    });

    it('returns 1000 for instant correct answer (elapsed = 0)', () => {
      assert.equal(scorePoints({ elapsedMs: 0, limitSec: 20, correct: true }), 1000);
    });

    it('returns 500 when elapsed = limit', () => {
      assert.equal(scorePoints({ elapsedMs: 20000, limitSec: 20, correct: true }), 500);
    });

    it('returns 500 when elapsed is past limit', () => {
      assert.equal(scorePoints({ elapsedMs: 25000, limitSec: 20, correct: true }), 500);
      assert.equal(scorePoints({ elapsedMs: 30000, limitSec: 20, correct: true }), 500);
    });

    it('calculates properly across two different limits', () => {
      // Limit 10s (10000ms): half time (5000ms) -> 750
      assert.equal(scorePoints({ elapsedMs: 5000, limitSec: 10, correct: true }), 750);
      assert.equal(scorePoints({ elapsedMs: 10000, limitSec: 10, correct: true }), 500);

      // Limit 60s (60000ms): half time (30000ms) -> 750
      assert.equal(scorePoints({ elapsedMs: 30000, limitSec: 60, correct: true }), 750);
      assert.equal(scorePoints({ elapsedMs: 60000, limitSec: 60, correct: true }), 500);
    });
  });

  describe('rankRows', () => {
    it('sorts scores and assigns competition ranks without mutating the input', () => {
      const rows = [
        { id: 'last', points: 10 },
        { id: 'tie-a', points: 20 },
        { id: 'first', points: 30 },
        { id: 'tie-b', points: 20 },
      ];
      assert.deepEqual(rankRows(rows, 'points'), [
        { id: 'first', points: 30, rank: 1 },
        { id: 'tie-a', points: 20, rank: 2 },
        { id: 'tie-b', points: 20, rank: 2 },
        { id: 'last', points: 10, rank: 4 },
      ]);
      assert.equal(rows[0].id, 'last');
      assert.ok(rows.every((row) => !('rank' in row)));
      assert.deepEqual(rankRows([], 'points'), []);
    });
  });

  describe('isLate around the grace boundary', () => {
    it('returns false when on or before deadline + GRACE_MS', () => {
      const deadline = 10000;
      assert.equal(isLate(9999, deadline), false);
      assert.equal(isLate(10000, deadline), false);
      assert.equal(isLate(10000 + GRACE_MS, deadline), false); // 10500 <= 10500
    });

    it('returns true when strictly after deadline + GRACE_MS', () => {
      const deadline = 10000;
      assert.equal(isLate(10000 + GRACE_MS + 1, deadline), true); // 10501 > 10500
      assert.equal(isLate(12000, deadline), true);
    });
  });

  describe('teamScore', () => {
    it('returns 0 for an empty list', () => {
      assert.equal(teamScore([]), 0);
    });

    it('returns the rounded average of member scores', () => {
      assert.equal(teamScore([1000, 800]), 900);
      assert.equal(teamScore([1000, 900, 850]), 917);
    });

    it('counts zeros (members who never answered)', () => {
      // 3 members, one did not answer (score 0) -> (1000 + 500 + 0) / 3 = 500
      assert.equal(teamScore([1000, 500, 0]), 500);
      assert.equal(teamScore([0, 0, 0]), 0);
    });
  });

  describe('pickTeam', () => {
    it('picks the team with the fewest members', () => {
      const teams = [
        { id: 'team-1', colorNo: 1, count: 5 },
        { id: 'team-2', colorNo: 2, count: 2 },
        { id: 'team-3', colorNo: 3, count: 4 },
      ];
      assert.equal(pickTeam(teams), 'team-2');
    });

    it('breaks ties using lowest colorNo', () => {
      const teams = [
        { id: 'team-3', colorNo: 3, count: 2 },
        { id: 'team-1', colorNo: 1, count: 2 },
        { id: 'team-2', colorNo: 2, count: 2 },
      ];
      assert.equal(pickTeam(teams), 'team-1');
    });

    it('handles empty team list', () => {
      assert.equal(pickTeam([]), null);
    });
  });

  describe('nextPhase transitions', () => {
    it('allows valid forward flow through question cycle', () => {
      // lobby -> start -> question (index 0)
      const q0 = nextPhase('lobby', 'start', { index: 0, total: 3 });
      assert.deepEqual(q0, { phase: 'question', index: 0 });

      // question -> reveal -> reveal
      const rev0 = nextPhase('question', 'reveal', { index: 0, total: 3 });
      assert.deepEqual(rev0, { phase: 'reveal', index: 0 });

      // reveal -> leaderboard -> leaderboard
      const lb0 = nextPhase('reveal', 'leaderboard', { index: 0, total: 3 });
      assert.deepEqual(lb0, { phase: 'leaderboard', index: 0 });

      // leaderboard -> next -> question (index 1) when index+1 < total
      const q1 = nextPhase('leaderboard', 'next', { index: 0, total: 3 });
      assert.deepEqual(q1, { phase: 'question', index: 1 });
    });

    it('rejects next past the last question', () => {
      // On question 2 (0-indexed) out of 3 total, index + 1 is 3 (not < 3)
      const res = nextPhase('leaderboard', 'next', { index: 2, total: 3 });
      assert.equal(res, null);
    });

    it('allows finish only on the last question from leaderboard', () => {
      // Not last question: should be rejected
      const notLast = nextPhase('leaderboard', 'finish', { index: 1, total: 3 });
      assert.equal(notLast, null);

      // Last question: allowed
      const last = nextPhase('leaderboard', 'finish', { index: 2, total: 3 });
      assert.deepEqual(last, { phase: 'ended', index: 2 });
    });

    it('allows end from any phase except ended', () => {
      assert.deepEqual(nextPhase('lobby', 'end', { index: 0 }), { phase: 'ended', index: 0 });
      assert.deepEqual(nextPhase('question', 'end', { index: 1 }), { phase: 'ended', index: 1 });
      assert.deepEqual(nextPhase('reveal', 'end', { index: 1 }), { phase: 'ended', index: 1 });
      assert.deepEqual(nextPhase('leaderboard', 'end', { index: 1 }), { phase: 'ended', index: 1 });

      // Cannot end from ended
      assert.equal(nextPhase('ended', 'end', { index: 1 }), null);
    });

    it('rejects out-of-order transitions', () => {
      assert.equal(nextPhase('lobby', 'reveal', { index: 0 }), null);
      assert.equal(nextPhase('lobby', 'leaderboard', { index: 0 }), null);
      assert.equal(nextPhase('question', 'start', { index: 0 }), null);
      assert.equal(nextPhase('question', 'leaderboard', { index: 0 }), null);
      assert.equal(nextPhase('reveal', 'start', { index: 0 }), null);
      assert.equal(nextPhase('reveal', 'next', { index: 0 }), null);
      assert.equal(nextPhase('leaderboard', 'start', { index: 0 }), null);
      assert.equal(nextPhase('leaderboard', 'reveal', { index: 0 }), null);
    });
  });

  describe('genPin format', () => {
    it('generates a 6-digit string where first digit is not 0', () => {
      for (let i = 0; i < 50; i++) {
        const pin = genPin();
        assert.equal(typeof pin, 'string');
        assert.equal(pin.length, 6);
        assert.ok(/^[1-9]\d{5}$/.test(pin), `PIN "${pin}" should match ^[1-9]\\d{5}$`);
      }
    });
  });

  describe('constants', () => {
    it('has correct TIME_LIMITS and TEAM_NAMES', () => {
      assert.deepEqual(TIME_LIMITS, [5, 10, 20, 30, 60, 90, 120]);
      assert.equal(TEAM_NAMES.length, 8);
      assert.equal(TEAM_NAMES[0], 'แดง'); // colorNo 1
      assert.equal(TEAM_NAMES[7], 'เทา'); // colorNo 8
    });
  });

  describe('deploy gate', () => {
    test.skip('every path in lib/live-assets.js (species, bg, music, sfx) must not start with /live/dev/ and must appear in public/live/CREDITS.md', {
      skip: 'every path in lib/live-assets.js (species, bg, music, sfx) must not start with \'/live/dev/\' and must appear in public/live/CREDITS.md',
    }, () => {
      const creditsPath = new URL('../public/live/CREDITS.md', import.meta.url);
      const credits = fs.readFileSync(creditsPath, 'utf8');

      const allPaths = [];

      for (const [name, sp] of Object.entries(LIVE_ASSETS.species || {})) {
        if (sp.skel) allPaths.push({ name: `species.${name}.skel`, path: sp.skel });
        if (sp.atlas) allPaths.push({ name: `species.${name}.atlas`, path: sp.atlas });
      }

      for (const [key, bgPath] of Object.entries(LIVE_ASSETS.bg || {})) {
        allPaths.push({ name: `bg.${key}`, path: bgPath });
      }

      for (const [key, musicPath] of Object.entries(LIVE_ASSETS.music || {})) {
        allPaths.push({ name: `music.${key}`, path: musicPath });
      }

      for (const [key, sfxPath] of Object.entries(LIVE_ASSETS.sfx || {})) {
        allPaths.push({ name: `sfx.${key}`, path: sfxPath });
      }

      assert.ok(allPaths.length > 0, 'Asset paths should not be empty');

      for (const item of allPaths) {
        assert.equal(
          item.path.startsWith('/live/dev/'),
          false,
          `Asset ${item.name} (${item.path}) must not start with /live/dev/`
        );
        const filename = item.path.split('/').pop();
        const found = credits.includes(item.path) || credits.includes(filename);
        assert.ok(
          found,
          `Asset ${item.name} (${item.path}) must appear in public/live/CREDITS.md`
        );
      }
    });
  });
});
