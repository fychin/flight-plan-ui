import { useMemo } from 'react'
import type { FlightPlanDetail, Geopoint } from '../types/flightPlan'
import { buildMapPoints, buildRouteLine, hasCoordinates, lineDistanceNm } from '../utils/routeGeo'
import { formatDistanceNm, getAirways } from '../utils/routeSummary'
import { EMPTY_VALUE, formatDateTime } from '../utils/format'
import { RouteLegs } from './RouteLegs'
import type { RouteLegsProps } from './RouteLegs'
import { FlightMapLegend } from './FlightMapLegend'
import './RouteSummary.css'

export type RouteSummaryProps = RouteLegsProps & {
  plan: FlightPlanDetail
  showAlternates: boolean
  onShowAlternates: (show: boolean) => void
  selectedAlternateId: string | null
  onSelectAlternate: (id: string | null) => void
}

export const RouteSummary = ({ plan, legs, selectedLegId, onSelectLeg, showAlternates, onShowAlternates,
  selectedAlternateId, onSelectAlternate }: RouteSummaryProps) => {
  const { points, distance } = useMemo(() => {
    const { points } = buildMapPoints(plan)
    return { points, distance: lineDistanceNm(buildRouteLine(points)) }
  }, [plan])
  const airways = getAirways(plan)
  const outlierCount = points.filter((point) => point.flagged).length
  const renderAlternates = (values: Geopoint[] | undefined, category: 'destination' | 'enroute') =>
    values?.length ? <ul className="route-summary__alternates">
      {values.map((point, index) => {
        const alternateId = `${category}-${index}`
        const selected = selectedAlternateId === alternateId
        return <li key={alternateId}>
          <button type="button" disabled={!hasCoordinates(point)} aria-pressed={selected}
            onClick={() => onSelectAlternate(selected ? null : alternateId)}>
            {point.value}{selected ? ' ✓ Selected' : ''}
          </button>
          {!hasCoordinates(point) && <span> No coordinates</span>}
        </li>
      })}
    </ul> : 'None'
  const selectedAlternate = selectedAlternateId?.startsWith('destination-')
    ? plan.alternates?.destination?.[Number(selectedAlternateId.slice('destination-'.length))]
    : selectedAlternateId?.startsWith('enroute-')
      ? plan.alternates?.enroute?.[Number(selectedAlternateId.slice('enroute-'.length))] : undefined

  return (
    <section className="route-summary" aria-labelledby="route-summary-heading">
      <h2 id="route-summary-heading" className="visually-hidden">Route summary</h2>
      <RouteLegs legs={legs} selectedLegId={selectedLegId} onSelectLeg={onSelectLeg} />
      <section className="route-summary__card" aria-labelledby="alternates-heading">
        <h3 id="alternates-heading">Alternates and airways</h3>
        <label className="route-summary__alternate-toggle">
          <input type="checkbox" checked={showAlternates} onChange={(event) => onShowAlternates(event.target.checked)} />
          Show alternate airports
        </label>
        <div className="route-summary__scroll" tabIndex={0} role="group" aria-label="Alternates and airways details">
          <dl className="route-summary__values">
            <div><dt>Destination alternates</dt><dd>{renderAlternates(plan.alternates?.destination, 'destination')}</dd></div>
            <div><dt>Enroute alternates</dt><dd>{renderAlternates(plan.alternates?.enroute, 'enroute')}</dd></div>
            <div><dt>Airways</dt><dd>{airways.length ? airways.join(', ') : 'None (direct)'}</dd></div>
          </dl>
        </div>
        <p className="visually-hidden" role="status" aria-live="polite">
          {selectedAlternate ? `Showing alternate airport ${selectedAlternate.value} on the map` : 'No alternate airport selected'}
        </p>
      </section>
      <section className="route-summary__card" aria-labelledby="timing-heading">
        <h3 id="timing-heading">Timing and stats</h3>
        <div className="route-summary__scroll" tabIndex={0} role="group" aria-label="Timing and route statistics">
          <dl className="route-summary__values">
            <div><dt>EOBT</dt><dd>{formatDateTime(plan.timing?.eobt)}</dd></div>
            <div><dt>EET</dt><dd>{plan.timing?.estimatedElapsedTime ?? EMPTY_VALUE}</dd></div>
            <div><dt>Estimated arrival</dt><dd>{formatDateTime(plan.timing?.estimatedArrival)}</dd></div>
            <div><dt>Approximate distance</dt><dd>{formatDistanceNm(distance)} <span>(great-circle estimate along the plotted route, not a flown distance)</span></dd></div>
            <div><dt>Leg count</dt><dd>{legs.length}</dd></div>
            <div><dt>Waypoints plotted</dt><dd>{points.length} plotted, {outlierCount} outliers excluded from route line</dd></div>
          </dl>
        </div>
      </section>
      <FlightMapLegend plan={plan} showAlternates={showAlternates}
        hasFocusedLeg={legs.some((leg) => leg.id === selectedLegId && leg.plottable)} />
    </section>
  )
}
