// Pure grading used by /api/tests/submit. questions: [{ id, answer }], answers: { [questionId]: choiceId }.
export interface GradingQuestion {
  id: string;
  answer: string | null;
}

export interface GradeResult {
  correct: number;
  total: number;
  answers: Record<string, string>;
}

export function gradeAnswers(
  questions: readonly GradingQuestion[],
  answers: unknown
): GradeResult {
  const given: Record<string, unknown> =
    answers && typeof answers === "object" && !Array.isArray(answers)
      ? (answers as Record<string, unknown>)
      : {};
  const clean: Record<string, string> = {}; // only known question ids with string values are kept/stored
  let correct = 0;
  for (const q of questions) {
    const a = given[q.id];
    if (typeof a !== "string") continue;
    clean[q.id] = a;
    if (a === q.answer) correct++;
  }
  return { correct, total: questions.length, answers: clean };
}
