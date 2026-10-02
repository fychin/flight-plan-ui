export type Aircraft = {
  type: string
  registration: string
}

export type Flight = {
  date: string
  eobt: string
  estimatedElapsedTime: string
}

export type Route = {
  summary: string
  elementCount: number
}

export type FlightPlan = {
  id: string
  flightIdentification: string
  departure: string
  destination: string
  aircraft: Aircraft
  flight: Flight
  cruise: Record<string, unknown>
  route: Route
  source: string
  updatedAt: string
}

export type Cursors = {
  first: string
  prev: string | null
  next: string | null
  last: string
}

export type Pagination = {
  totalItems: number
  pageSize: number
  page: number
  totalPages: number
  cursors: Cursors
}

export type FlightPlanResponse = {
  data: FlightPlan[]
  pagination: Pagination
}
