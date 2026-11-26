export type WizardStepKey = "basics" | "video" | "docs" | "test" | "assign" | "summary"

export interface WizardStepItem {
  key: WizardStepKey
  label: string
  hint?: string
}

export interface BasicsDraft {
  title: string
  description: string
  status: string
  has_docs: boolean
  has_pretest: boolean
  has_posttest: boolean
  has_assignment: boolean
  allow_ai: boolean
  watch_limit: boolean
}
