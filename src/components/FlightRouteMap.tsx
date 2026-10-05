import { useEffect, useMemo } from 'react'
import type { FlightPlanDetail } from '../types/flightPlan'
import type { Coordinates, MapPoint } from '../utils/routeGeo'
import type { RouteLeg } from '../utils/routeLegs'
import { buildMapPoints } from '../utils/routeGeo'
import { buildRouteMapLines } from '../utils/routeMapLines'
import type { MapLine, MapMarker } from './map/types'
import { MapView } from './map/MapView'
import { FLIGHT_AIRWAY_LINE_STYLE, FLIGHT_ROUTE_LINE_STYLE, FLIGHT_LEG_HIGHLIGHT_STYLE, resolveFlightMapPointStyle } from './flightRouteMapStyles'
import './FlightRouteMap.css'

export type FlightRouteMapProps = {
  plan: FlightPlanDetail
  focusedLeg?: RouteLeg | null
  showAlternates?: boolean
  focusedAlternate?: (Coordinates & { id: string }) | null
}

const getPointRoleLabel = (point: MapPoint) => {
  switch (point.role) {
    case 'departure': return 'Departure'
    case 'destination': return 'Destination'
    case 'destination-alternate': return 'Destination alternate'
    case 'enroute-alternate': return 'Enroute alternate'
    case 'airway-waypoint': return `Airway waypoint${point.airway ? ` (${point.airway})` : ''}`
    case 'route-point': return 'Route point'
  }
}

export const FlightRouteMap = ({ plan, focusedLeg, showAlternates = false, focusedAlternate }: FlightRouteMapProps) => {
  const { points, skipped, flagged, markers, lines } = useMemo(() => {
    const result = buildMapPoints(plan)
    const visiblePoints = result.points.filter((point) => showAlternates ||
      (point.role !== 'destination-alternate' && point.role !== 'enroute-alternate'))
    const markers: MapMarker[] = visiblePoints.map((point) => {
      const details = [getPointRoleLabel(point)]
      if (point.type) details.push(`Type: ${point.type}`)
      details.push(`Coordinates: ${point.latitude.toFixed(2)}, ${point.longitude.toFixed(2)}`)
      if (point.flagged) details.push('Outlier: far from route')
      return {
        id: point.id, latitude: point.latitude, longitude: point.longitude,
        label: point.value, details, style: resolveFlightMapPointStyle(point).style,
        flagged: point.flagged, showLabel: point.role !== 'airway-waypoint',
      }
    })
    const lines: MapLine[] = buildRouteMapLines(plan).map((line) => ({
      id: line.id, coordinates: line.coordinates, label: line.airway ?? 'DCT',
      style: line.airway !== undefined ? FLIGHT_AIRWAY_LINE_STYLE : FLIGHT_ROUTE_LINE_STYLE,
    }))
    return { points: result.points, skipped: result.skipped, flagged: result.points.filter((point) => point.flagged).map((point) => point.value), markers, lines }
  }, [plan, showAlternates])
  useEffect(() => {
    if (flagged.length > 0) {
      console.warn(`Not on the route line (far from the departure–destination corridor): ${flagged.join(', ')}`)
    }
    if (skipped.length > 0) {
      console.warn(`Not plotted (missing coordinates): ${skipped.join(', ')}`)
    }
  }, [flagged, skipped])
  const focusedLines = useMemo(() => focusedLeg?.plottable ? [
    ...lines, { id: 'leg-highlight', coordinates: focusedLeg.coordinates, style: FLIGHT_LEG_HIGHLIGHT_STYLE },
  ] : lines, [lines, focusedLeg])
  const focus = useMemo(() => focusedAlternate && showAlternates
    ? { key: `alternate-${focusedAlternate.id}`, coordinates: [focusedAlternate] }
    : focusedLeg?.plottable ? { key: focusedLeg.id, coordinates: focusedLeg.coordinates } : null,
  [focusedAlternate, showAlternates, focusedLeg])

  return (
    <section className="flight-route-map" aria-label="Flight route map">
      {points.length ? <MapView markers={markers} lines={focusedLines} focus={focus}
        ariaLabel={`Map of route for ${plan.flightIdentification ?? 'flight plan'}`} /> : (
        <p className="flight-route-map__empty" role="status">No coordinates available to plot.</p>
      )}
    </section>
  )
}
