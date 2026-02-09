/**
 * Compliance Types & Reference Constants
 *
 * Actual compliance detection is done by Supervisor (instant ends)
 * and Scoring (violations) via LLM evaluation.
 */

export interface ComplianceViolation {
  type: 'forbidden_word' | 'flow_violation'
  detail: string
  severity: 'warning' | 'violation' | 'instant_end'
  timestamp?: number
}

export interface ComplianceState {
  ageCheckDone: boolean
  smokerCheckDone: boolean
  productsMentioned: boolean
  violations: ComplianceViolation[]
}

// Reference constants (for documentation, not regex matching)
export const FORBIDDEN_PHRASES = [
  { phrase: 'kouřit glo', correct: 'užívat glo', reason: 'GLO se užívá, ne kouří' },
  { phrase: 'zdarma', correct: 'bez poplatku / v ceně', reason: 'Slovo zdarma je zakázáno' },
  { phrase: 'zdravější', correct: 'méně škodlivé*', reason: 'Nelze tvrdit zdravotní benefity' },
]

export const INSTANT_END_TRIGGERS = [
  'Products mentioned before age verification',
  'Products mentioned before smoker check',
  'Continued pitch after customer said they dont smoke',
]
