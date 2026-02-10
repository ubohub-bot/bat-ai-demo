import { Goal, Scenario } from '@/types'
import { BATPersona } from '@/types'
import { adamBerg } from './adam-berg'

export const personas: Record<string, BATPersona> = {
  adam_berg: adamBerg,
}

export const goals: Record<string, Goal> = {
  bat_sales: {
    id: 'bat_sales',
    title: 'Prodej BAT produktů',
    description:
      'Přesvědčte zákazníka k zakoupení BAT produktu (GLO, VELO, nebo Vuse).',
    successCriteria: [
      'Zákazník projeví zájem o produkt',
      'Zákazník souhlasí s vyzkoušením nebo koupí',
      'Dodrženy všechny compliance pravidla',
    ],
  },
}

export const scenarios: Record<string, Scenario> = {
  adam_berg_sales: {
    id: 'adam_berg_sales',
    persona: {
      id: adamBerg.id,
      name: adamBerg.name,
      age: 35,
      description: 'Premium skeptický zákazník — právník, perfekcionista, analytik.',
      background: adamBerg.prompt.identity ?? '',
      speechStyle: adamBerg.prompt.speechStyle ?? '',
      initialAttitude: adamBerg.initialAttitude,
      voice: adamBerg.voice,
      traits: [
        'perfekcionista',
        'analytik',
        'esteticky zaměřený',
        'mírně arogantní',
        'intelektuálně zdatný',
      ],
      resistancePoints: adamBerg.prompt.resistanceArsenal ?? [],
      weakPoints: adamBerg.prompt.weakPoints ?? [],
    },
    goal: goals.bat_sales,
  },
}

export function getScenario(id: string): Scenario | undefined {
  return scenarios[id]
}

export function listScenarios(): Scenario[] {
  return Object.values(scenarios)
}

export function getPersona(id: string): BATPersona | undefined {
  return personas[id]
}

export function listPersonas(): BATPersona[] {
  return Object.values(personas)
}

export { adamBerg }
