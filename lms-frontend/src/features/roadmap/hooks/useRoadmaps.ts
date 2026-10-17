import { useQuery } from '@tanstack/react-query'
import { roadmapService } from '../api/roadmap.service'
import { roadmapKeys } from '../api/queryKeys'

/** The signed-in student's personalised learning roadmaps. */
export const useRoadmaps = () =>
  useQuery({ queryKey: roadmapKeys.all, queryFn: () => roadmapService.getRoadmaps() })
