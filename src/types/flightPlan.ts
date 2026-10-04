export type Aircraft = {
  type: string
  registration: string
}

export type Flight = {
  date: string
  eobt: string
  estimatedElapsedTime: string
}

export type SpeedUnit = 'KT' | 'MACH' | 'KMH'

export type Cruise = {
  flightLevel?: number
  speed?: {
    value?: number
    unit?: SpeedUnit
  }
}

export type Route = {
  summary: string
  elementCount: number
}

export type FlightPlanListItem = {
  id: string
  flightIdentification: string
  departure: string
  destination: string
  aircraft: Aircraft
  flight: Flight
  cruise: Cruise
  route: Route
  source: string
  updatedAt: string
}

export type Cursors = {
  first: string | null
  prev: string | null
  next: string | null
  last: string | null
}

export type Pagination = {
  totalItems: number
  pageSize: number
  page: number
  totalPages: number
  cursors: Cursors
}

export type FlightPlanResponse = {
  data: FlightPlanListItem[]
  pagination: Pagination
}

export type GeopointType = 'airport' | 'airway' | 'fix' | 'navaid' | 'runway'

export type Geopoint = {
  value: string
  type: GeopointType | null
  latitude?: number
  longitude?: number
}

export type RoutePoint = Geopoint & {
  speed?: string
  flightLevel?: string
}

export type AirwayWaypoint = Geopoint & {
  /** Zero-based index in the airway's official sequence. */
  indexInAirway: number
}

export type AirwayContext = {
  type: 'airway'
  airway: string
  waypoints: AirwayWaypoint[]
}

export type DirectContext = {
  type: 'direct'
}

export type RouteContext = AirwayContext | DirectContext

export type RouteSegment = {
  from: RoutePoint
  to: RoutePoint
  context?: RouteContext
}

export type ParsedRoute = {
  segments: RouteSegment[]
}

export type FlightPlanAlternates = {
  destination?: Geopoint[]
  enroute?: Geopoint[]
}

export type FlightPlanTiming = {
  eobt?: string
  estimatedArrival?: string
  estimatedElapsedTime?: string
}

export type FlightPlanDetail = {
  id?: string
  flightIdentification?: string
  aircraft?: string
  departure?: Geopoint
  destination?: Geopoint
  alternates?: FlightPlanAlternates
  timing?: FlightPlanTiming
  /** Null when the flight plan has no routeElement. */
  route?: ParsedRoute | null
}

export type ErrorResponse = {
  error: string
}
