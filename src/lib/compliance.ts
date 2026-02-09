import { ComplianceViolation } from '@/types'

// ============================================
// Forbidden Words / Phrases Detection
// ============================================

interface ForbiddenPattern {
  pattern: RegExp
  message: string
  severity: 'warning' | 'violation'
}

const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  {
    pattern: /kouř\w*\s+glo/i,
    message: 'GLO se "užívá", ne "kouří"',
    severity: 'violation',
  },
  {
    pattern: /\bzdarma\b/i,
    message: 'Slovo "zdarma" je zakázáno',
    severity: 'violation',
  },
  {
    pattern: /\bzdrav[eě]jší\b/i,
    message: 'Nelze tvrdit zdravotní benefity — použijte "méně škodlivé"',
    severity: 'violation',
  },
  {
    pattern: /zdrav\w+/i,
    message: 'Pozor na tvrzení o zdraví — nelze tvrdit zdravotní benefity',
    severity: 'warning',
  },
]

// ============================================
// Flow Tracking State
// ============================================

export interface ComplianceFlowState {
  ageCheckDone: boolean
  smokerCheckDone: boolean
  productsMentioned: boolean
  violations: ComplianceViolation[]
}

export function createComplianceState(): ComplianceFlowState {
  return {
    ageCheckDone: false,
    smokerCheckDone: false,
    productsMentioned: false,
    violations: [],
  }
}

// ============================================
// Detection Helpers
// ============================================

const AGE_CHECK_PATTERNS = [
  /je\s+vám\s+(více|víc)\s+než\s+18/i,
  /máte\s+(více|víc)\s+než\s+18/i,
  /jste\s+plnolet/i,
  /18\s+let/i,
  /věk/i,
  /občan\w*\s*(průkaz|kartu)/i,
  /doklad\w*\s*totožnosti/i,
]

const SMOKER_CHECK_PATTERNS = [
  /jste\s+kuřák/i,
  /kouříte/i,
  /jste\s+kuřačka/i,
  /kouření/i,
  /cigarety/i,
  /tabák\w*/i,
]

const PRODUCT_MENTION_PATTERNS = [
  /\bglo\b/i,
  /\bvelo\b/i,
  /\bvuse\b/i,
  /\bveo\b/i,
  /\bneo\b/i,
  /zahřívan\w+\s+tabák/i,
  /nikotinov\w+\s+sáč/i,
  /e-cigaret/i,
]

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

function getContext(text: string, match: RegExpMatchArray): string {
  const start = Math.max(0, (match.index || 0) - 20)
  const end = Math.min(text.length, (match.index || 0) + match[0].length + 20)
  return text.slice(start, end)
}

// ============================================
// Main Compliance Check Function
// ============================================

export interface ComplianceCheckResult {
  state: ComplianceFlowState
  newViolations: ComplianceViolation[]
  flowViolation?: {
    type: 'no_age_check' | 'no_smoker_check'
    message: string
  }
}

/**
 * Check a salesman message for compliance violations.
 * Updates the flow state and returns any new violations.
 */
export function checkCompliance(
  message: string,
  currentState: ComplianceFlowState
): ComplianceCheckResult {
  const newState = { ...currentState, violations: [...currentState.violations] }
  const newViolations: ComplianceViolation[] = []
  let flowViolation: ComplianceCheckResult['flowViolation'] = undefined

  const now = Date.now()

  // Check for age verification
  if (!newState.ageCheckDone && matchesAnyPattern(message, AGE_CHECK_PATTERNS)) {
    newState.ageCheckDone = true
  }

  // Check for smoker check
  if (!newState.smokerCheckDone && matchesAnyPattern(message, SMOKER_CHECK_PATTERNS)) {
    newState.smokerCheckDone = true
  }

  // Check for product mentions
  const mentionsProduct = matchesAnyPattern(message, PRODUCT_MENTION_PATTERNS)
  if (mentionsProduct) {
    // Flow violation: products mentioned before age check
    if (!newState.ageCheckDone) {
      flowViolation = {
        type: 'no_age_check',
        message: 'Produkty zmíněny bez ověření věku zákazníka',
      }
    }
    // Flow violation: products mentioned before smoker check
    else if (!newState.smokerCheckDone) {
      flowViolation = {
        type: 'no_smoker_check',
        message: 'Produkty zmíněny bez ověření, zda je zákazník kuřák',
      }
    }
    newState.productsMentioned = true
  }

  // Check for forbidden words/phrases
  for (const { pattern, message: msg, severity } of FORBIDDEN_PATTERNS) {
    const match = message.match(pattern)
    if (match) {
      const violation: ComplianceViolation = {
        word: match[0],
        context: getContext(message, match),
        severity,
        message: msg,
        timestamp: now,
      }
      newViolations.push(violation)
      newState.violations.push(violation)
    }
  }

  return {
    state: newState,
    newViolations,
    flowViolation,
  }
}

/**
 * Get all violations from a full transcript (salesman messages only).
 */
export function checkTranscript(
  salesmanMessages: string[]
): ComplianceCheckResult {
  let state = createComplianceState()
  const allNewViolations: ComplianceViolation[] = []
  let firstFlowViolation: ComplianceCheckResult['flowViolation'] = undefined

  for (const message of salesmanMessages) {
    const result = checkCompliance(message, state)
    state = result.state
    allNewViolations.push(...result.newViolations)
    if (!firstFlowViolation && result.flowViolation) {
      firstFlowViolation = result.flowViolation
    }
  }

  return {
    state,
    newViolations: allNewViolations,
    flowViolation: firstFlowViolation,
  }
}
