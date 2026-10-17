import { useQuery } from '@tanstack/react-query'
import { combineQueries } from '@shared/utils/async-state'
import { masteryService } from '../api/mastery.service'
import { masteryKeys } from '../api/queryKeys'

/** The signed-in student's mastery of every knowledge component. */
export const useKcMastery = () =>
  useQuery({ queryKey: masteryKeys.kc, queryFn: () => masteryService.getKcMastery() })

/** The signed-in student's ability score per subject. */
export const useCompetencies = () =>
  useQuery({ queryKey: masteryKeys.competencies, queryFn: () => masteryService.getCompetencies() })

/** Everything the mastery page shows, as one combined query. */
export const useMasteryOverview = () => {
  const kcs = useKcMastery()
  const competencies = useCompetencies()
  return combineQueries([kcs, competencies] as const, ([kcList, competencyList]) => ({ kcs: kcList, competencies: competencyList }))
}
