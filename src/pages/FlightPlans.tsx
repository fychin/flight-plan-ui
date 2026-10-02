import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type {
  FlightPlan,
  FlightPlanResponse,
  Pagination,
} from '../types/flightPlan'
import { fetchFlightPlans } from '../api/flightPlan'
import FlightPlanTable from '../components/FlightPlanTable'
import PaginationControls from '../components/PaginationControls'
import './FlightPlans.css'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const DEFAULT_PAGE_SIZE = 10

function FlightPlans() {
  const [flightPlans, setFlightPlans] = useState<FlightPlan[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [prevCursor, setPrevCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const navigate = useNavigate()

  // Used to ignore stale responses when requests overlap.
  const requestIdRef = useRef(0)
  const lastCursorRef = useRef<string | null>(null)

  const loadFlightPlans = useCallback(
    (cursor: string | null) => {
      const requestId = ++requestIdRef.current
      lastCursorRef.current = cursor
      setLoading(true)
      setError(null)

      // Previous data is intentionally kept on screen while loading so the
      // table doesn't collapse/jump; the table shows an overlay instead.
      fetchFlightPlans(cursor, pageSize)
        .then((json: FlightPlanResponse) => {
          if (requestId !== requestIdRef.current) return
          setFlightPlans(json.data)
          setPagination(json.pagination)
          setNextCursor(json.pagination.cursors.next)
          setPrevCursor(json.pagination.cursors.prev)
        })
        .catch((err: unknown) => {
          if (requestId !== requestIdRef.current) return
          setError(err instanceof Error ? err.message : 'Something went wrong')
          setFlightPlans([])
          setPagination(null)
          setNextCursor(null)
          setPrevCursor(null)
        })
        .finally(() => {
          if (requestId !== requestIdRef.current) return
          setLoading(false)
        })
    },
    [pageSize],
  )

  useEffect(() => {
    loadFlightPlans(null)
  }, [loadFlightPlans])

  const handleNext = () => {
    if (nextCursor) {
      loadFlightPlans(nextCursor)
    }
  }

  const handlePrev = () => {
    if (prevCursor) {
      loadFlightPlans(prevCursor)
    }
  }

  const handleFirst = () => {
    loadFlightPlans(null)
  }

  const handleLast = () => {
    if (pagination?.cursors.last) {
      loadFlightPlans(pagination.cursors.last)
    }
  }

  const handleRetry = () => {
    loadFlightPlans(lastCursorRef.current)
  }

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value)
    setPageSize(value)
  }

  const handleRowClick = (plan: FlightPlan) => {
    navigate(`/flight-plan/${plan.id}`)
  }

  const showTable = loading || flightPlans.length > 0

  return (
    <main className="flight-plan-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Flight Plans</h1>
        </div>
        {showTable && (
          <div className="table-header-controls">
            <PaginationControls
              pagination={pagination}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onNext={handleNext}
              onLast={handleLast}
              loading={loading}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={handlePageSizeChange}
              variant="full"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="status error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && flightPlans.length === 0 && (
        <p className="empty-state">No flight plans found.</p>
      )}

      {showTable && (
        <>
          <FlightPlanTable
            flightPlans={flightPlans}
            onRowClick={handleRowClick}
            loading={loading}
            skeletonRows={pageSize}
          />
          <PaginationControls
            pagination={pagination}
            onFirst={handleFirst}
            onPrev={handlePrev}
            onNext={handleNext}
            onLast={handleLast}
            loading={loading}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
            variant="buttons"
          />
        </>
      )}
    </main>
  )
}

export default FlightPlans
