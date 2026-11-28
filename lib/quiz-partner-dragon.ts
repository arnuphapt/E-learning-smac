export interface QuizPartnerDragonInfo {
  speciesId: string;
  isPartner: true;
}

export interface DragonMeSummary {
  species_id: string;
  is_partner: boolean;
  growth?: {
    stage?: string;
  } | null;
}

/** Return partner info only when the student's partner dragon is already an adult. */
export function resolveAdultPartner(
  dragons: readonly DragonMeSummary[] | null | undefined,
): QuizPartnerDragonInfo | null {
  if (!Array.isArray(dragons)) return null;
  const partner = dragons.find((d) => d.is_partner);
  if (!partner || partner.growth?.stage !== "adult") return null;
  return {
    speciesId: partner.species_id,
    isPartner: true,
  };
}

/**
 * Pick a deterministic choice tile index for a question (unrelated to the correct answer)
 * so the perched dragon stays on the same tile across re-renders.
 */
export function pickPartnerChoiceIndex(
  questionIndex: number,
  choiceCount: number,
  seed = "",
): number {
  if (!Number.isFinite(choiceCount) || choiceCount <= 0) return -1;
  const n = Math.floor(choiceCount);
  if (n === 1) return 0;

  // FNV-1a mix of seed + questionIndex
  let h = 2166136261;
  const key = `${seed}:${questionIndex}`;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % n;
}
