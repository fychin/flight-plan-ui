import type { FlightPlanDetail } from '../types/flightPlan'
import { buildAirwayLines } from './routeGeo'
import type { Coordinates } from './routeGeo'
import { buildRouteLegs } from './routeLegs'

export type RouteMapLine = {
  id: string
  coordinates: Coordinates[]
  airway?: string
}

/** Draw each filed leg once: direct connections or the airway's valid fixes. */
export const buildRouteMapLines = (plan: FlightPlanDetail): RouteMapLine[] => {
  const airwayLegIds = new Set(
    (plan.route?.segments ?? []).flatMap((segment, index) =>
      segment.context?.type === 'airway' ? [`segment-${index}`] : [],
    ),
  )

  return [
    ...buildRouteLegs(plan)
      .filter((leg) => leg.plottable && !airwayLegIds.has(leg.id))
      .map((leg) => ({ id: `route-${leg.id}`, coordinates: leg.coordinates })),
    ...buildAirwayLines(plan).map((line) => ({ ...line, id: `airway-${line.id}` })),
  ]
}
