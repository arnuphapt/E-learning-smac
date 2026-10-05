// Pure grading used by /api/tests/submit. questions: [{ id, answer }], answers: { [questionId]: choiceId }.
export function gradeAnswers(questions, answers) {
  const given = answers && typeof answers === "object" && !Array.isArray(answers) ? answers : {};
  const clean = {}; // only known question ids with string values are kept/stored
  let correct = 0;
  for (const q of questions) {
    const a = given[q.id];
    if (typeof a !== "string") continue;
    clean[q.id] = a;
    if (a === q.answer) correct++;
  }
  return { correct, total: questions.length, answers: clean };
}
