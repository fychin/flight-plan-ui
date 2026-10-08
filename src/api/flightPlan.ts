import type {
  ErrorResponse,
  FlightPlanDetail,
  FlightPlanResponse,
} from '../types/flightPlan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

const isErrorResponse = (value: unknown): value is ErrorResponse =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof value.error === 'string'

const getErrorMessage = async (res: Response): Promise<string> => {
  try {
    const body: unknown = await res.json()
    if (isErrorResponse(body) && body.error) {
      return body.error
    }
  } catch {
    // Body was empty or not JSON; fall back to the status message.
  }
  return `Request failed with status ${res.status}`
}

export const fetchFlightPlans = (
  cursor: string | null,
  pageSize: number,
): Promise<FlightPlanResponse> => {
  const searchParams = new URLSearchParams()
  if (cursor) {
    searchParams.set('cursor', cursor)
  } else {
    searchParams.set('pageSize', String(pageSize))
  }

  return fetch(`${API_BASE_URL}/api/flight-plan?${searchParams}`).then((res) => {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`)
    }
    return res.json()
  })
}

export const fetchFlightPlanById = async (
  id: string,
  signal?: AbortSignal,
): Promise<FlightPlanDetail> => {
  const res = await fetch(
    `${API_BASE_URL}/api/flight-plan/${encodeURIComponent(id)}`,
    { signal },
  )
  if (!res.ok) {
    throw new Error(await getErrorMessage(res))
  }
  return res.json()
}
