import type { FlightPlanDetail } from '../types/flightPlan'

export const getAirways = (plan: FlightPlanDetail): string[] => {
  const names = new Set<string>()
  for (const segment of plan.route?.segments ?? []) {
    if (segment.context?.type === 'airway') names.add(segment.context.airway)
  }
  return [...names]
}

export const formatDistanceNm = (value: number): string => `${Math.round(value)} NM`
