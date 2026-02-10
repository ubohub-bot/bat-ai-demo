import { BATPersona, ToolDefinition } from '@/types'

/**
 * End conversation tool — used by the AI customer to signal conversation end.
 */
const END_CONVERSATION_TOOL: ToolDefinition[] = [
  {
    type: 'function',
    name: 'end_conversation',
    description:
      'Ukonči rozhovor. Použij když ses rozhodl — přesvědčen, odmítáš, odcházíš, nebo při compliance selhání.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          enum: ['converted', 'rejected', 'walked_away', 'compliance_fail'],
          description:
            'Důvod ukončení: converted (přesvědčen), rejected (odmítl), walked_away (odešel), compliance_fail (hosteska porušila pravidla).',
        },
      },
      required: ['reason'],
    },
  },
]

/**
 * Build the ONE-TIME system prompt for the realtime persona.
 * Uses monolithic fullPrompt + attitude system + ending rules.
 */
export function buildPersonaPrompt(
  persona: BATPersona
): { systemPrompt: string; tools: ToolDefinition[] } {
  const systemPrompt = persona.prompt.fullPrompt
    + `\n\n# Attitude System (INTERNAL)`
    + `\n- Začínáš na ${persona.initialAttitude}/10`
    + `\n- Empatie, relevantní info, respekt k času → postoj roste`
    + `\n- Tlak, agresivita, ignorování námitek → postoj RYCHLE klesá`
    + `\n- CONVERTED: postoj 6+ a stoupající, souhlasíš s produktem`
    + `\n- WALKED_AWAY: postoj pod 3, nebo příliš agresivní pitch`
    + `\n- REJECTED: nezájem, nedotčen`
    + `\n\n## Ending the Conversation`
    + `\n- Používej end_conversation když ses rozhodl — NETAHEJ TO.`
    + `\n- VŽDY řekni rozloučení ve STEJNÉ odpovědi jako end_conversation.`

  return { systemPrompt, tools: END_CONVERSATION_TOOL }
}
