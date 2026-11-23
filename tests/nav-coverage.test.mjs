import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { instructorNav } from "../lib/nav/instructor.ts";
import { studentNav } from "../lib/nav/student.ts";
import { buildCrumbs, flattenNav, resolveNav } from "../lib/nav/match.ts";

function pageRoutes(root, base) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/^page\.(tsx|ts|jsx|js)$/.test(name)) {
        const rel = relative(root, dir).split(sep).filter(Boolean).filter((s) => !/^\(.*\)$/.test(s));
        out.push("/" + [base, ...rel].filter(Boolean).join("/"));
      }
    }
  };
  walk(root);
  return out.sort();
}

const isDynamic = (r) => /\[.+\]/.test(r);

const parentOf = (nav) => (p) => resolveNav(nav, p)?.leaf.href;

for (const [name, nav, root, base] of [["i", instructorNav, "app/i", "i"], ["s", studentNav, "app/s", "s"]]) {
  const routes = pageRoutes(root, base);
  const flat = flattenNav(nav);
  const hrefs = new Set(flat.map((e) => e.leaf.href));
  const patterns = new Set(flat.flatMap((e) => e.leaf.match ?? []));

  test(`every static /${name} page route is a menu item or sub-item`, () => {
    const missing = routes.filter((r) => !isDynamic(r) && !hrefs.has(r) && !nav.redirects?.includes(r));
    assert.deepEqual(missing, [], `add these routes to lib/nav/${name === "i" ? "instructor" : "student"}.ts`);
  });

  test(`every dynamic /${name} page route has a parent entry via \`match\``, () => {
    const orphan = routes.filter((r) => isDynamic(r) && !resolveNav(nav, r.replace(/\[[^\]]+\]/g, "x")));
    assert.deepEqual(orphan, [], "add these routes to a `match` list in the nav config");
  });

  test(`every /${name} menu href and match pattern points at a real page`, () => {
    for (const h of hrefs) assert.ok(routes.includes(h), `no page for href ${h}`);
    for (const p of patterns) {
      const base = p.replace(/\/\*\*$/, "");
      assert.ok(routes.some((r) => r === base || r.startsWith(base + "/")), `no page under pattern ${p}`);
    }
  });
}

test("instructor dynamic routes resolve to the intended parent and build a breadcrumb", () => {
  const parent = parentOf(instructorNav);
  assert.equal(parent("/i/course/abc"), "/i/courses");
  assert.equal(parent("/i/lesson/abc"), "/i/courses");
  assert.equal(parent("/i/lesson/abc/scores"), "/i/courses");
  assert.equal(parent("/i/lesson/abc/bank"), "/i/tutor");
  assert.equal(parent("/i/tutor/abc"), "/i/tutor");
  assert.equal(parent("/i/tutor/bank"), "/i/tutor/bank");
  assert.equal(parent("/i/live/abc/results"), "/i/live");
  assert.equal(parent("/i/live/quizzes/abc"), "/i/live/quizzes");
  assert.equal(parent("/i/live/quizzes"), "/i/live/quizzes");
  assert.equal(parent("/i/submissions/abc"), "/i/submissions");
  assert.equal(parent("/i/grade/abc"), "/i/submissions");
  assert.equal(buildCrumbs(instructorNav, "/i/course/abc").at(-1).title, "รายละเอียด");
});

test("student dynamic routes resolve to the intended parent and build a breadcrumb", () => {
  const parent = parentOf(studentNav);
  assert.equal(parent("/s/course/abc"), "/s/courses");
  assert.equal(parent("/s/lesson/abc"), "/s/courses");
  assert.equal(parent("/s/lesson/abc/ai"), "/s/courses");
  assert.equal(parent("/s/test/abc/pre"), "/s/courses");
  assert.equal(parent("/s/test/abc/pre/result"), "/s/courses");
  assert.equal(parent("/s/tutor/abc"), "/s/tutor");
  assert.equal(parent("/s/tutor/lesson/abc"), "/s/tutor");
  assert.equal(parent("/s/tutor/lesson/abc/exam"), "/s/tutor");
  assert.equal(parent("/s/tutor/lesson/abc/result"), "/s/tutor");
  assert.equal(parent("/s/live/abc"), "/s/live");
  assert.equal(parent("/s/assignment/abc"), "/s/assignments");
  assert.equal(buildCrumbs(studentNav, "/s/course/abc").at(-1).title, "รายละเอียด");
});
