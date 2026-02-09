import { ToolDefinition } from '@/types'
import { PERSONA_PROMPT, PERSONA_CONFIG, END_CONVERSATION_TOOL } from '@/prompts'

/**
 * Build the ONE-TIME system prompt for the realtime persona.
 * 
 * Now uses consolidated prompt from src/prompts/persona.prompt.ts
 * Edit that file to iterate on the persona.
 */
export function buildPersonaPrompt(): { 
  systemPrompt: string
  tools: ToolDefinition[]
  config: typeof PERSONA_CONFIG
} {
  return {
    systemPrompt: PERSONA_PROMPT,
    tools: [END_CONVERSATION_TOOL as ToolDefinition],
    config: PERSONA_CONFIG,
  }
}

/**
 * Get persona config (id, name, voice, initialAttitude)
 */
export function getPersonaConfig() {
  return PERSONA_CONFIG
}
