/**
 * PROMPTS - Single import for all prompts
 * 
 * Usage:
 *   import { PERSONA_PROMPT, buildSupervisorPrompt, buildScoringPrompt } from '@/prompts'
 * 
 * Edit the individual .prompt.ts files to iterate on prompts.
 * Each file is self-contained and easy to test.
 */

// Persona
export {
  PERSONA_PROMPT,
  PERSONA_CONFIG,
  END_CONVERSATION_TOOL,
} from './persona.prompt'

// Supervisor
export {
  buildSupervisorPrompt,
  buildStateInjection,
  type SupervisorInput,
  type StateInjectionInput,
} from './supervisor.prompt'

// Scoring
export {
  buildScoringPrompt,
  calculateOverallScore,
  detectForbiddenWords,
  SCORING_WEIGHTS,
  FORBIDDEN_WORDS,
  type ScoringInput,
} from './scoring.prompt'
