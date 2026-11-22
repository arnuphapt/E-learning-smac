/**
 * Fixed answer-option colours for live quiz (shape + colour pair per option, A-D).
 * They are the game's identity on the projector and on phones, so they do not follow the
 * light/dark theme tokens. Tailwind palette only, defined once here. Amber uses dark text for WCAG AA.
 */
export interface AnswerTheme {
  /** Full tile (host question, player buttons). */
  tile: string
  /** Small label text on top of `tile`. */
  label: string
  /** Icon chip on top of `tile`. */
  icon: string
  /** Checkmark chip on top of `tile`. */
  check: string
  /** Solid badge without border (reveal chip, editor badge). */
  badge: string
}

export const ANSWER_PALETTE: readonly AnswerTheme[] = [
  { tile: "border-red-700 bg-red-600 text-white", label: "text-white/90", icon: "bg-black/20 text-white", check: "bg-white text-red-600", badge: "bg-red-600 text-white" },
  { tile: "border-blue-800 bg-blue-700 text-white", label: "text-white/90", icon: "bg-black/20 text-white", check: "bg-white text-blue-700", badge: "bg-blue-700 text-white" },
  { tile: "border-amber-600 bg-amber-500 text-slate-950", label: "text-amber-950", icon: "bg-black/15 text-slate-950", check: "bg-slate-950 text-amber-500", badge: "bg-amber-500 text-slate-950" },
  { tile: "border-green-800 bg-green-700 text-white", label: "text-white/90", icon: "bg-black/20 text-white", check: "bg-white text-green-700", badge: "bg-green-700 text-white" },
]

export function answerTheme(index: number): AnswerTheme {
  return ANSWER_PALETTE[index] ?? ANSWER_PALETTE[0]
}
