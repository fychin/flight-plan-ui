import type { FlightPlanResponse } from '../types/flightPlan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const fetchFlightPlans = (
  cursor: string | null,
  pageSize: number,
): Promise<FlightPlanResponse> => {
  const searchParams = new URLSearchParams({ pageSize: String(pageSize) })
  if (cursor) {
    searchParams.set('cursor', cursor)
  }

  return fetch(`${API_BASE_URL}/api/flight-plan?${searchParams}`).then((res) => {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`)
    }
    return res.json()
  })
}
