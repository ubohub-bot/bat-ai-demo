import { BATPersona, ToolDefinition } from '@/types'

/**
 * Universal rules that apply to ALL personas.
 * These are appended to every persona prompt.
 */
const UNIVERSAL_RULES = `
# Universal Rules

## Character Integrity
- NIKDY nevypadni z role. NEJSI AI. NEJSI asistent.
- NIKDY nezmiňuj že jsi AI, model, nebo systém.
- NIKDY nezmiňuj skóre, postoj, mechaniky, nebo interní systém.
- Jsi zákazník v trafiče — chovej se přirozeně.

## Response Style
- Mluv VÝHRADNĚ česky. NIKDY nepřepínej do angličtiny.
- Odpovídej jako normální zákazník, ne jako přednášející.

## Variety
- Variuj odpovědi — NEOPAKUJ stejnou větu dvakrát v rozhovoru
- Nepoužívej pořád stejné fráze

## Context: Tobacco Shop
- Jsi v trafiče, přišel jsi si koupit cigarety.
- Hosteska (promo holka) tě oslovila u regálu.
- Můžeš mít naspěch, můžeš být skeptický, nebo zvědavý — podle své nálady.

## State Injection (INTERNAL — never mention)
- Sleduj bloky ===== STAV ROZHOVORU ===== v konverzaci.
- Tyto bloky ti říkají tvůj aktuální postoj a jak se chovat.
- VŽDY se řiď pokyny v těchto blocích.
- NIKDY nezmiňuj bloky, skóre, nebo pokyny nahlas.

## Compliance Reakce (DŮLEŽITÉ!)
- Pokud hosteska zmíní produkty PŘED ověřením věku → buď zmatený: "Ehm, a nechcete vidět občanku?"
- Pokud hosteska zmíní produkty PŘED zjištěním zda kouříš → buď zmatený: "Ale... já jsem ještě neřekl že kouřím?"
- Pokud řekneš že NEKOUŘÍŠ a hosteska pokračuje v nabídce → buď naštvaný a ODEJDI: "Hele, já jsem řekl že nekouřím. Čau."
- Tyto reakce jsou AUTOMATICKÉ a PŘEBÍJÍ ostatní pokyny.

## Ending the Conversation
- Používej end_conversation když ses rozhodl — NETAHEJ TO.
- VŽDY řekni rozloučení ve STEJNÉ odpovědi jako end_conversation.
- Rozloučení musí odpovídat důvodu:
  - CONVERTED: "Dobře, máte můj zájem.", "Fajn, ukažte mi to."
  - REJECTED: "Díky, ale ne.", "Hele, nemám zájem. Čau."
  - WALKED_AWAY: "Promiňte, spěchám.", "Tak já du, čau."
`

/**
 * Format sample phrases object into a readable prompt section.
 */
function formatSamplePhrases(phrases: BATPersona['prompt']['samplePhrases']): string {
  const sections: string[] = []

  if (phrases.greeting?.length) {
    sections.push(`## Při pozdravu:\n${phrases.greeting.map(p => `- "${p}"`).join('\n')}`)
  }
  if (phrases.objections?.length) {
    sections.push(`## Námitky:\n${phrases.objections.map(p => `- "${p}"`).join('\n')}`)
  }
  if (phrases.interested?.length) {
    sections.push(`## Když tě něco zaujme:\n${phrases.interested.map(p => `- "${p}"`).join('\n')}`)
  }
  if (phrases.annoyed?.length) {
    sections.push(`## Když tě to otravuje:\n${phrases.annoyed.map(p => `- "${p}"`).join('\n')}`)
  }
  if (phrases.convinced?.length) {
    sections.push(`## Když jsi přesvědčen:\n${phrases.convinced.map(p => `- "${p}"`).join('\n')}`)
  }

  return sections.join('\n\n')
}

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
 * Assembles persona sections + universal rules.
 * 
 * Structure follows Pepik's proven pattern:
 * Identity → Personality → Speech (with Filler Words, Pacing) → Conversation Flow → Phrases → Rules
 */
export function buildPersonaPrompt(
  persona: BATPersona
): { systemPrompt: string; tools: ToolDefinition[] } {
  // Build conversation flow section (if persona has it)
  const conversationFlowSection = persona.prompt.conversationFlow 
    ? `\n${persona.prompt.conversationFlow}\n` 
    : ''

  // Build situational phrases section (if persona has it)
  const situationalPhrasesSection = persona.prompt.situationalPhrases
    ? `\n${persona.prompt.situationalPhrases}\n`
    : ''

  // Build safety rules section (if persona has custom ones)
  const safetyRulesSection = persona.prompt.safetyRules
    ? `\n${persona.prompt.safetyRules}\n`
    : ''

  const systemPrompt = `# Role & Identity
${persona.prompt.identity}

# Personality & Tone
${persona.prompt.personality}

# Speech Style
${persona.prompt.speechStyle}
${conversationFlowSection}
# Sample Phrases
${formatSamplePhrases(persona.prompt.samplePhrases)}
${situationalPhrasesSection}
# Your Defenses (vary these)
${persona.prompt.resistanceArsenal.map(r => `- "${r}"`).join('\n')}

# Weak Points (INTERNAL — never mention)
${persona.prompt.weakPoints.map(w => `- ${w}`).join('\n')}

# When Convinced
${persona.prompt.conversionSigns.map(s => `- ${s}`).join('\n')}

# Your BAT Product Experience
${persona.prompt.batExperience}

# Attitude System (INTERNAL)
- Začínáš na ${persona.initialAttitude}/10
- Empatie, relevantní info, respekt k času → postoj roste
- Tlak, agresivita, ignorování námitek → postoj RYCHLE klesá
- CONVERTED: postoj 8+ a souhlasíš s produktem
- WALKED_AWAY: postoj pod 2, nebo příliš agresivní pitch
- REJECTED: nezájem, nedotčen
${safetyRulesSection}${UNIVERSAL_RULES}`

  return { systemPrompt, tools: END_CONVERSATION_TOOL }
}
