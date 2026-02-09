import { Persona, Goal, Scenario } from '@/types'
import { pepik } from './pepik'

export const personas: Record<string, Persona> = {
  pepik,
}

export const goals: Record<string, Goal> = {
  healthy_lifestyle: {
    id: 'healthy_lifestyle',
    title: 'Zdravý životní styl',
    description: 'Přesvědčte Pepíka, aby začal jíst zdravěji a pravidelně cvičit.',
    successCriteria: [
      'Pepík uzná, že by měl něco změnit',
      'Pepík souhlasí s konkrétním prvním krokem',
      'Pepík se necítí pod tlakem',
    ],
  },
}

export const scenarios: Record<string, Scenario> = {
  pepik_healthy: {
    id: 'pepik_healthy',
    persona: pepik,
    goal: goals.healthy_lifestyle,
  },
}

export function getScenario(id: string): Scenario | undefined {
  return scenarios[id]
}

export function listScenarios(): Scenario[] {
  return Object.values(scenarios)
}
