import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImportRows, TEMPLATE_HEADERS, TEMPLATE_EXAMPLES, MAX_IMPORT_ROWS } from "../lib/tutor-import.js";

const H = TEMPLATE_HEADERS;
const rows = (...body) => [H, ...body];
// [โจทย์, ก, ข, ค, ง, จ, เฉลย, คำอธิบาย, หัวข้อ]
const r = (text, c, answer, explanation = "", topic = "") => [text, c[0] ?? "", c[1] ?? "", c[2] ?? "", c[3] ?? "", c[4] ?? "", answer, explanation, topic];

test("template examples parse cleanly", () => {
  const { ok, errors } = parseImportRows(rows(...TEMPLATE_EXAMPLES));
  assert.deepEqual(errors, []);
  assert.equal(ok.length, 2);
});

test("valid rows: trimmed, ids generated, answer mapped to the generated id, excel row numbers", () => {
  const { ok, errors } = parseImportRows(rows(r("  Q1 ", [" x ", "y", "z"], "ค", " why ", " Heart ")), { firstRow: 3 });
  assert.deepEqual(errors, []);
  const q = ok[0];
  assert.equal(q.row, 4);
  assert.equal(q.text, "Q1");
  assert.deepEqual(q.choices.map((c) => c.text), ["x", "y", "z"]);
  assert.equal(new Set(q.choices.map((c) => c.id)).size, 3);
  assert.equal(q.answer, q.choices[2].id);
  assert.equal(q.explanation, "why");
  assert.equal(q.topicName, "Heart");
});

test("missing question", () => {
  const { ok, errors } = parseImportRows(rows(r("", ["a", "b"], "ก")));
  assert.equal(ok.length, 0);
  assert.deepEqual(errors, [{ row: 2, message: "ไม่มีโจทย์" }]);
});

test("fewer than 2 choices (blank / whitespace do not count)", () => {
  const { ok, errors } = parseImportRows(rows(r("Q", ["a", "   "], "ก")));
  assert.equal(ok.length, 0);
  assert.match(errors[0].message, /อย่างน้อย 2/);
});

test("answer pointing to an empty choice, and invalid / missing answers", () => {
  const { ok, errors } = parseImportRows(rows(
    r("Q1", ["a", "b"], "ค"),
    r("Q2", ["a", "b"], "ฉ"),
    r("Q3", ["a", "b"], ""),
    r("Q4", ["a", "b"], "6"),
  ));
  assert.equal(ok.length, 0);
  assert.deepEqual(errors.map((e) => e.row), [2, 3, 4, 5]);
  assert.match(errors[0].message, /ว่าง/);
  assert.match(errors[1].message, /ไม่ถูกต้อง/);
  assert.match(errors[2].message, /ไม่มีเฉลย/);
});

test("answer formats: ก-จ, A-E (any case, with dot), 1-5 as text or number", () => {
  const c = ["a", "b", "c", "d", "e"];
  const { ok, errors } = parseImportRows(rows(...["ง", "d", "D.", " d ", 4, "4"].map((a) => r("Q", c, a))));
  assert.deepEqual(errors, []);
  for (const q of ok) assert.equal(q.answer, q.choices[3].id);
  const e = parseImportRows(rows(r("Q", c, "จ"), r("Q", c, "E"), r("Q", c, 5), r("Q", c, "ก"), r("Q", c, "a"), r("Q", c, 1)));
  assert.deepEqual(e.ok.map((q) => q.choices.findIndex((x) => x.id === q.answer)), [4, 4, 4, 0, 0, 0]);
});

test("choices with a gap keep the answer on the right text", () => {
  const { ok } = parseImportRows(rows(r("Q", ["a", "b", "", "d"], "ง")));
  assert.deepEqual(ok[0].choices.map((c) => c.text), ["a", "b", "d"]);
  assert.equal(ok[0].choices.find((c) => c.id === ok[0].answer).text, "d");
});

test("fully empty rows are skipped; row numbers still match the sheet", () => {
  const { ok, errors } = parseImportRows([H, ["", "", "", "", "", "", "", "", ""], ["  ", null], r("Q", ["a", "b"], "ก"), [], r("", ["a", "b"], "ก")]);
  assert.equal(ok.length, 1);
  assert.equal(ok[0].row, 4);
  assert.deepEqual(errors, [{ row: 6, message: "ไม่มีโจทย์" }]);
});

test("topic: one spelling per case-insensitive name, existing lesson topics win, blank stays blank", () => {
  const { ok } = parseImportRows(rows(
    r("Q1", ["a", "b"], "ก", "", "  Heart Failure "),
    r("Q2", ["a", "b"], "ก", "", "heart failure"),
    r("Q3", ["a", "b"], "ก", "", "KIDNEY"),
    r("Q4", ["a", "b"], "ก", "", "   "),
  ), { existingTopics: [{ name: "Kidney" }] });
  assert.deepEqual(ok.map((q) => q.topicName), ["Heart Failure", "Heart Failure", "Kidney", ""]);
});

test("header variants: spacing, punctuation, case, aliases, column order, optional columns absent", () => {
  const { ok, errors } = parseImportRows([
    [" เฉลย ", "ตัวเลือกข", "ตัวเลือก(ก)", "  โจทย์  "],
    ["B", "two", "one", "Q"],
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(ok[0].choices.map((c) => c.text), ["one", "two"]);
  assert.equal(ok[0].choices.find((c) => c.id === ok[0].answer).text, "two");
  assert.equal(ok[0].explanation, "");
  assert.equal(ok[0].topicName, "");
});

test("file-level errors: missing required column, empty file, header only, over the row cap", () => {
  assert.match(parseImportRows([["โจทย์", "ตัวเลือก ก"], ["Q", "a"]]).errors[0].message, /ตัวเลือก ข.*เฉลย/);
  assert.equal(parseImportRows([]).errors[0].row, null);
  assert.match(parseImportRows([H]).errors[0].message, /ไม่พบข้อสอบ/);
  const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => r("Q", ["a", "b"], "ก"));
  const big = parseImportRows(rows(...many));
  assert.equal(big.ok.length, 0);
  assert.match(big.errors[0].message, /500/);
  assert.equal(parseImportRows(rows(...many.slice(0, MAX_IMPORT_ROWS))).ok.length, MAX_IMPORT_ROWS);
});
