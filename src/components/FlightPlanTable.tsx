import type { FlightPlan } from '../types/flightPlan'
import './FlightPlanTable.css'

type FlightPlanTableProps = {
  flightPlans: FlightPlan[]
  onRowClick?: (plan: FlightPlan) => void
  loading?: boolean
  skeletonRows?: number
}

const COLUMNS = [
  'Ident',
  'Date',
  'EOBT',
  'EET',
  'Departure',
  'Destination',
  'Aircraft',
  'Registration',
  'Source',
  'Updated',
]

function FlightPlanTable({
  flightPlans,
  onRowClick,
  loading = false,
  skeletonRows = 10,
}: FlightPlanTableProps) {
  // First load (nothing to show yet): render skeleton rows.
  const showSkeleton = loading && flightPlans.length === 0

  return (
    <div
      className={`table-card${loading ? ' is-loading' : ''}`}
      aria-busy={loading}
    >
      <div className="table-wrapper">
        <table className="flight-plan-table">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {showSkeleton
              ? Array.from({ length: skeletonRows }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="skeleton-row">
                    {COLUMNS.map((column) => (
                      <td key={column}>
                        <span className="skeleton-bar" />
                      </td>
                    ))}
                  </tr>
                ))
              : flightPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    onClick={() => onRowClick?.(plan)}
                    className={onRowClick ? 'clickable' : undefined}
                  >
                    <td className="cell-ident">{plan.flightIdentification}</td>
                    <td>{plan.flight.date}</td>
                    <td>{plan.flight.eobt}</td>
                    <td>{plan.flight.estimatedElapsedTime}</td>
                    <td>
                      <span className="code-chip">{plan.departure}</span>
                    </td>
                    <td>
                      <span className="code-chip">{plan.destination}</span>
                    </td>
                    <td>{plan.aircraft.type}</td>
                    <td>{plan.aircraft.registration}</td>
                    <td>
                      <span className="source-badge">{plan.source}</span>
                    </td>
                    <td className="cell-muted">
                      {new Date(plan.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {loading && !showSkeleton && (
        <div className="table-overlay" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span className="visually-hidden">Loading flight plans…</span>
        </div>
      )}
    </div>
  )
}

export default FlightPlanTable
