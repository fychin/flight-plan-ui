import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { FlightPlanDetail } from '../types/flightPlan'
import { buildAirwayLines, buildMapPoints, buildRouteLine } from '../utils/routeGeo'
import type { MarkerShape } from './map/types'
import { FLIGHT_AIRWAY_LINE_STYLE, FLIGHT_LEG_HIGHLIGHT_STYLE, FLIGHT_ROUTE_LINE_STYLE, resolveFlightMapPointStyle } from './flightRouteMapStyles'
import './FlightMapLegend.css'

export type FlightMapLegendProps = {
  plan: FlightPlanDetail
  showAlternates: boolean
  hasFocusedLeg: boolean
}

type LegendEntry = { label: string; color: string; shape?: MarkerShape; dashed?: boolean }

export const FlightMapLegend = ({ plan, showAlternates, hasFocusedLeg }: FlightMapLegendProps) => {
  const entries = useMemo(() => {
    const { points } = buildMapPoints(plan)
    const categories = new Map<string, LegendEntry>()
    for (const point of points) {
      if (!showAlternates && (point.role === 'destination-alternate' || point.role === 'enroute-alternate')) continue
      const resolved = resolveFlightMapPointStyle(point)
      categories.set(resolved.legendLabel, { label: resolved.legendLabel, color: resolved.style.color, shape: resolved.style.shape })
    }
    if (buildRouteLine(points).length >= 2) {
      categories.set('Filed route', { label: 'Filed route', color: FLIGHT_ROUTE_LINE_STYLE.color })
    }
    const airways = [...new Set(buildAirwayLines(plan).map((line) => line.airway))]
    if (airways.length) {
      categories.set('Airway overlay', { label: `Airway overlay: ${airways.join(', ')}`, color: FLIGHT_AIRWAY_LINE_STYLE.color, dashed: true })
    }
    if (hasFocusedLeg) categories.set('Selected leg', { label: 'Selected leg', color: FLIGHT_LEG_HIGHLIGHT_STYLE.color })
    return [...categories.values()]
  }, [plan, showAlternates, hasFocusedLeg])

  return (
    <section className="route-summary__card flight-map-legend" aria-labelledby="map-legend-heading">
      <h3 id="map-legend-heading">Legend</h3>
      <div className="route-summary__scroll" tabIndex={0} role="group" aria-label="Map legend details">
        {entries.length ? <ul className="flight-map-legend__list" aria-label="Map legend">
          {entries.map((entry) => <li key={entry.label}>
            <span className={`flight-map-legend__swatch flight-map-legend__swatch--${entry.shape ?? 'line'}${entry.dashed ? ' flight-map-legend__swatch--dashed' : ''}`}
              style={{ '--swatch-color': entry.color } as CSSProperties} aria-hidden="true" />
            <span>{entry.label}</span>
          </li>)}
        </ul> : <p>No map features available.</p>}
      </div>
    </section>
  )
}
