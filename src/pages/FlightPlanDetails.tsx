import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { FlightPlan } from '../types/flightPlan'
import './FlightPlanDetails.css'

function FlightPlanDetails() {
  const { id } = useParams<{ id: string }>()
  const [plan, setPlan] = useState<FlightPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }

    setLoading(true)
    setError(null)

    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/flight-plan/${id}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`)
        }
        return res.json()
      })
      .then((json: FlightPlan) => {
        setPlan(json)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
      .finally(() => {
        setLoading(false)
      })
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
      <Link to="/" className="back-link">
        ← Back to flight plans
      </Link>
      <h1>{plan.flightIdentification}</h1>
      <dl className="details-grid">
        <div>
          <dt>Date</dt>
          <dd>{plan.flight.date}</dd>
        </div>
        <div>
          <dt>EOBT</dt>
          <dd>{plan.flight.eobt}</dd>
        </div>
        <div>
          <dt>EET</dt>
          <dd>{plan.flight.estimatedElapsedTime}</dd>
        </div>
        <div>
          <dt>Departure</dt>
          <dd>{plan.departure}</dd>
        </div>
        <div>
          <dt>Destination</dt>
          <dd>{plan.destination}</dd>
        </div>
        <div>
          <dt>Aircraft</dt>
          <dd>{plan.aircraft.type}</dd>
        </div>
        <div>
          <dt>Registration</dt>
          <dd>{plan.aircraft.registration}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{plan.source}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{new Date(plan.updatedAt).toLocaleString()}</dd>
        </div>
        <div className="full-width">
          <dt>Route</dt>
          <dd>{plan.route.summary}</dd>
        </div>
      </dl>
    </main>
  )
}

export default FlightPlanDetails
