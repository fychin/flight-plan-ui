import type { FlightPlanResponse } from '../types/flightPlan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const fetchFlightPlans = (
  cursor: string | null,
  pageSize: number,
): Promise<FlightPlanResponse> => {
  const url = new URL(`${API_BASE_URL}/api/flight-plan`)
  url.searchParams.set('pageSize', String(pageSize))
  if (cursor) {
    url.searchParams.set('cursor', cursor)
  }

  return fetch(url.toString()).then((res) => {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`)
    }
    return res.json()
  })
}
