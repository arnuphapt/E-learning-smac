import type { RubricCriterion } from "@/components/lesson/types"

/** Splits a graded total over the rubric criteria (largest remainder), so the panel opens on the saved score. */
export function distributeScore(totalScore: number | null, criteria: RubricCriterion[], totalPoints: number): Record<string, number> {
  if (totalScore == null) {
    return Object.fromEntries(criteria.map((c) => [c.id, 0]))
  }

  const rawScores = criteria.map((c) => ({
    id: c.id,
    max: c.max,
    val: (totalScore / totalPoints) * c.max,
  }))

  const scores: Record<string, number> = {}
  let currentSum = 0

  rawScores.forEach((c) => {
    const floored = Math.floor(c.val)
    scores[c.id] = floored
    currentSum += floored
  })

  const remainder = totalScore - currentSum
  if (remainder > 0) {
    const sortedByFraction = rawScores
      .map((c) => ({ id: c.id, fraction: c.val - Math.floor(c.val), max: c.max }))
      .sort((a, b) => b.fraction - a.fraction)

    for (let i = 0; i < remainder; i++) {
      const item = sortedByFraction[i % sortedByFraction.length]
      if (scores[item.id] < item.max) {
        scores[item.id] += 1
      }
    }
  }

  return scores
}
