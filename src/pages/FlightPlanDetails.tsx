import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchFlightPlanById } from '../api/flightPlan'
import { RouteSummary } from '../components/RouteSummary'
import type { FlightPlanDetail } from '../types/flightPlan'
import { EMPTY_VALUE, formatDateTime } from '../utils/format'
import { buildRouteLegs } from '../utils/routeLegs'
import { hasCoordinates } from '../utils/routeGeo'
import './FlightPlanDetails.css'

const FlightRouteMap = lazy(() =>
  import('../components/FlightRouteMap').then(({ FlightRouteMap }) => ({ default: FlightRouteMap })),
)

function FlightPlanDetails() {
  const { id } = useParams<{ id: string }>()
  const [plan, setPlan] = useState<FlightPlanDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedLegId, setSelectedLegId] = useState<string | null>(null)
  const [showAlternates, setShowAlternates] = useState(false)
  const [selectedAlternateId, setSelectedAlternateId] = useState<string | null>(null)
  const legs = useMemo(() => plan ? buildRouteLegs(plan) : [], [plan])
  const selectedLeg = legs.find((leg) => leg.id === selectedLegId) ?? null
  const focusedAlternate = useMemo(() => {
    if (!selectedAlternateId || !showAlternates) return null
    const alternates = [
      ...(plan?.alternates?.destination ?? []).map((point, index) => ({ id: `destination-${index}`, point })),
      ...(plan?.alternates?.enroute ?? []).map((point, index) => ({ id: `enroute-${index}`, point })),
    ]
    const selected = alternates.find((alternate) => alternate.id === selectedAlternateId)
    return selected && hasCoordinates(selected.point) ? { id: selected.id, ...selected.point } : null
  }, [plan, selectedAlternateId, showAlternates])

  const selectLeg = (legId: string | null) => {
    setSelectedAlternateId(null)
    setSelectedLegId(legId)
  }
  const selectAlternate = (alternateId: string | null) => {
    setSelectedLegId(null)
    setSelectedAlternateId(alternateId)
    if (alternateId) setShowAlternates(true)
  }
  const toggleAlternates = (show: boolean) => {
    setShowAlternates(show)
    if (!show) setSelectedAlternateId(null)
  }

  useEffect(() => {
    if (!id) {
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setSelectedLegId(null)
    setShowAlternates(false)
    setSelectedAlternateId(null)

    fetchFlightPlanById(id, controller.signal)
      .then((json) => {
        if (!controller.signal.aborted) {
          setPlan(json)
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setPlan(null)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [id])

  if (loading) {
    return (
      <main className="details-page">
        <p className="status">Loading flight plan…</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="details-page">
        <p className="status error">{error}</p>
      </main>
    )
  }

  if (!plan) {
    return (
      <main className="details-page">
        <p className="status">No flight plan found.</p>
      </main>
    )
  }

  return (
    <main className="details-page">
      <header className="details-summary-bar">
        <h1>{plan.flightIdentification ?? EMPTY_VALUE}</h1>
        <dl className="details-summary-values">
          <div className="details-summary-airport details-summary-airport--departure">
            <dt>Departure</dt>
            <dd>{plan.departure?.value ?? EMPTY_VALUE}</dd>
          </div>
          <div className="details-summary-airport details-summary-airport--destination">
            <dt>Destination</dt>
            <dd>{plan.destination?.value ?? EMPTY_VALUE}</dd>
          </div>
        </dl>
        <dl className="details-summary-values details-summary-metadata">
          <div>
            <dt>Aircraft</dt>
            <dd>{plan.aircraft ?? EMPTY_VALUE}</dd>
          </div>
          <div>
            <dt>EOBT</dt>
            <dd>{formatDateTime(plan.timing?.eobt)}</dd>
          </div>
          <div>
            <dt>Estimated arrival</dt>
            <dd>{formatDateTime(plan.timing?.estimatedArrival)}</dd>
          </div>
        </dl>
      </header>
      <Suspense fallback={
        <div className="details-map-placeholder" role="status">Loading route map…</div>
      }>
        <FlightRouteMap plan={plan} focusedLeg={selectedLeg} showAlternates={showAlternates} focusedAlternate={focusedAlternate} />
      </Suspense>
      <RouteSummary plan={plan} legs={legs} selectedLegId={selectedLegId} onSelectLeg={selectLeg}
        showAlternates={showAlternates} onShowAlternates={toggleAlternates}
        selectedAlternateId={selectedAlternateId} onSelectAlternate={selectAlternate} />
    </main>
  )
}

export default FlightPlanDetails
