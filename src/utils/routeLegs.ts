import type { FlightPlanDetail, Geopoint, RoutePoint } from '../types/flightPlan'
import {
  distanceToSegmentNm, hasCoordinates, lineDistanceNm, OUTLIER_DISTANCE_NM,
} from './routeGeo'
import type { Coordinates } from './routeGeo'

export type RouteLeg = {
  id: string
  sequence: number
  from: string
  to: string
  via: string
  label?: 'Departure' | 'Arrival'
  distanceNm: number
  speed?: string
  flightLevel?: string
  coordinates: Coordinates[]
  outlierCount: number
  plottable: boolean
}

/** Selectable paths reuse the map corridor rule, without changing filed geometry. */
export const buildRouteLegs = (plan: FlightPlanDetail): RouteLeg[] => {
  const legs: RouteLeg[] = []
  const { departure, destination } = plan
  const corridor = departure && destination && hasCoordinates(departure) && hasCoordinates(destination)
    ? { departure, destination } : null

  const addLeg = (
    id: string, from: RoutePoint, to: Geopoint, via: string,
    nodes: Geopoint[], label?: RouteLeg['label'],
  ) => {
    let outlierCount = 0
    const coordinates: Coordinates[] = []
    for (const node of nodes) {
      if (!hasCoordinates(node)) continue
      if (corridor && node !== departure && node !== destination &&
        distanceToSegmentNm(node, corridor.departure, corridor.destination) > OUTLIER_DISTANCE_NM) {
        outlierCount += 1
        continue
      }
      const previous = coordinates[coordinates.length - 1]
      if (!previous || previous.latitude !== node.latitude || previous.longitude !== node.longitude) {
        coordinates.push({ latitude: node.latitude, longitude: node.longitude })
      }
    }
    legs.push({
      id, sequence: legs.length + 1, from: from.value, to: to.value, via, label,
      speed: from.speed, flightLevel: from.flightLevel,
      coordinates, distanceNm: lineDistanceNm(coordinates), outlierCount,
      plottable: new Set(coordinates.map(({ latitude, longitude }) => `${latitude}|${longitude}`)).size >= 2,
    })
  }

  const segments = plan.route?.segments ?? []
  if (!segments.length) {
    if (departure && destination && hasCoordinates(departure) && hasCoordinates(destination)) {
      addLeg('direct', departure, destination, 'DCT', [departure, destination])
    }
    return legs
  }

  const first = segments[0].from
  if (departure && departure.value !== first.value && hasCoordinates(departure) && hasCoordinates(first)) {
    addLeg('departure', departure, first, 'DCT', [departure, first], 'Departure')
  }
  segments.forEach((segment, index) => {
    const context = segment.context
    const waypoints = context?.type === 'airway' ? context.waypoints : []
    addLeg(`segment-${index}`, segment.from, segment.to,
      context?.type === 'airway' ? context.airway : 'DCT',
      [segment.from, ...waypoints, segment.to])
  })
  const last = segments[segments.length - 1].to
  if (destination && destination.value !== last.value && hasCoordinates(last) && hasCoordinates(destination)) {
    addLeg('arrival', last, destination, 'DCT', [last, destination], 'Arrival')
  }
  return legs
}
