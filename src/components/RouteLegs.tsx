import { useEffect, useRef } from 'react'
import type { RouteLeg } from '../utils/routeLegs'
import { formatDistanceNm } from '../utils/routeSummary'
import './RouteLegs.css'

export type RouteLegsProps = {
  legs: RouteLeg[]
  selectedLegId: string | null
  onSelectLeg: (id: string | null) => void
}

export const RouteLegs = ({ legs, selectedLegId, onSelectLeg }: RouteLegsProps) => {
  const selectedRef = useRef<HTMLButtonElement>(null)
  const selected = legs.find((leg) => leg.id === selectedLegId)
  useEffect(() => {
    const reduced = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    selectedRef.current?.scrollIntoView?.({ block: 'nearest', behavior: reduced ? 'instant' : 'smooth' })
  }, [selectedLegId])

  return (
    <section className="route-legs route-summary__card" aria-labelledby="route-legs-heading">
      <header className="route-legs__header">
        <h3 id="route-legs-heading">Routes</h3>
        <button type="button" onClick={() => onSelectLeg(null)} disabled={!selected}>
          Show full route
        </button>
      </header>
      <div className="route-summary__scroll" tabIndex={0} role="group" aria-label="Routes list">
        {legs.length ? (
          <ol className="route-legs__list">
            {legs.map((leg) => {
              const pressed = leg.id === selectedLegId
              return (
                <li key={leg.id}>
                  <button type="button" className="route-legs__leg" aria-pressed={pressed}
                    disabled={!leg.plottable} ref={pressed ? selectedRef : undefined}
                    onClick={() => onSelectLeg(pressed ? null : leg.id)}>
                    <span className="route-legs__sequence">{leg.sequence}</span>
                    <span className="route-legs__content">
                      <strong>{leg.from} → {leg.to}</strong>
                      <span className="route-legs__meta">
                        {leg.label && <span>{leg.label}</span>}
                        <span className="route-legs__badge">{leg.via}</span>
                        <span>{formatDistanceNm(leg.distanceNm)}</span>
                        {leg.speed && <span>{leg.speed}</span>}
                        {leg.flightLevel && <span>{leg.flightLevel}</span>}
                        {pressed && <strong>✓ Selected</strong>}
                        {!leg.plottable && <span>No coordinates</span>}
                      </span>
                      {leg.outlierCount > 0 && <span>{leg.outlierCount} outlier waypoints not shown</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : <p>No route elements filed.</p>}
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {selected ? `Showing ${selected.from} → ${selected.to} on the map` : 'Showing full route'}
      </p>
    </section>
  )
}
