import type { Pagination } from '../types/flightPlan'

type PaginationControlsProps = {
  pagination: Pagination | null
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  loading: boolean
  pageSize: number
  pageSizeOptions: number[]
  onPageSizeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  variant?: 'full' | 'buttons'
}

function PaginationControls({
  pagination,
  onFirst,
  onPrev,
  onNext,
  onLast,
  loading,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  variant = 'full',
}: PaginationControlsProps) {
  if (!pagination) {
    return null
  }

  const isFirst = pagination.page === 1
  const isLast = pagination.page === pagination.totalPages

  if (variant === 'buttons') {
    return (
      <nav className="pagination pagination-bottom" aria-label="Pagination">
        <div className="pagination-buttons">
          <button
            type="button"
            className="btn-edge"
            onClick={onFirst}
            disabled={loading || isFirst}
            aria-label="First page"
          >
            « First
          </button>
          <button
            type="button"
            onClick={onPrev}
            disabled={loading || isFirst}
            aria-label="Previous page"
          >
            ‹ Previous
          </button>
          <span className="page-info" aria-live="polite">
            {loading && <span className="mini-spinner" aria-hidden="true" />}
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={loading || isLast}
            aria-label="Next page"
          >
            Next ›
          </button>
          <button
            type="button"
            className="btn-edge"
            onClick={onLast}
            disabled={loading || isLast}
            aria-label="Last page"
          >
            Last »
          </button>
        </div>
      </nav>
    )
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-left">
        <span className="total-info">
          Total: {pagination.totalItems.toLocaleString()}
        </span>
        <div className="page-size-control">
          <label htmlFor="page-size">Rows per page</label>
          <select
            id="page-size"
            value={pageSize}
            onChange={onPageSizeChange}
            disabled={loading}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pagination-buttons">
        <button
          type="button"
          className="btn-edge"
          onClick={onFirst}
          disabled={loading || isFirst}
          aria-label="First page"
        >
          « First
        </button>
        <button
          type="button"
          onClick={onPrev}
          disabled={loading || isFirst}
          aria-label="Previous page"
        >
          ‹ Previous
        </button>
        <span className="page-info" aria-live="polite">
          {loading && <span className="mini-spinner" aria-hidden="true" />}
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={loading || isLast}
          aria-label="Next page"
        >
          Next ›
        </button>
        <button
          type="button"
          className="btn-edge"
          onClick={onLast}
          disabled={loading || isLast}
          aria-label="Last page"
        >
          Last »
        </button>
      </div>
    </nav>
  )
}

export default PaginationControls
