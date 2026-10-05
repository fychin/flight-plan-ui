import type {
  FlightPlanDetail,
  Geopoint,
  GeopointType,
} from '../types/flightPlan'

export type Coordinates = {
  latitude: number
  longitude: number
}

export type MapPointRole =
  | 'departure'
  | 'destination'
  | 'destination-alternate'
  | 'enroute-alternate'
  | 'route-point'
  | 'airway-waypoint'

export type MapPoint = Coordinates & {
  id: string
  value: string
  type: GeopointType | null
  role: MapPointRole
  /** Name of the airway this waypoint belongs to (airway-waypoint only). */
  airway?: string
  /** True when the point is implausibly far from the route corridor. */
  flagged: boolean
}

export type MapPointsResult = {
  points: MapPoint[]
  /** Unique identifiers of points dropped for missing/invalid coordinates. */
  skipped: string[]
}

export type AirwayLine = {
  id: string
  airway: string
  coordinates: Coordinates[]
}

export const EARTH_RADIUS_NM = 3440.065

/**
 * Route points further than this from the great-circle line between the
 * departure and destination are flagged as outliers.
 */
export const OUTLIER_DISTANCE_NM = 1500

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const hasCoordinates = <T extends Geopoint>(
  geopoint: T,
): geopoint is T & Coordinates => {
  const { latitude, longitude } = geopoint
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  )
}

/** Haversine great-circle distance in nautical miles. */
export const greatCircleDistanceNm = (a: Coordinates, b: Coordinates) => {
  const deltaLat = toRadians(b.latitude - a.latitude)
  const deltaLon = toRadians(b.longitude - a.longitude)
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) *
      Math.cos(toRadians(b.latitude)) *
      Math.sin(deltaLon / 2) ** 2
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.min(1, Math.sqrt(h)))
}

const initialBearingRad = (from: Coordinates, to: Coordinates) => {
  const fromLat = toRadians(from.latitude)
  const toLat = toRadians(to.latitude)
  const deltaLon = toRadians(to.longitude - from.longitude)
  return Math.atan2(
    Math.sin(deltaLon) * Math.cos(toLat),
    Math.cos(fromLat) * Math.sin(toLat) -
      Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon),
  )
}

/**
 * Shortest distance in nautical miles from `point` to the great-circle
 * segment `start` -> `end`. Beyond either end it is the distance to that end.
 */
export const distanceToSegmentNm = (
  point: Coordinates,
  start: Coordinates,
  end: Coordinates,
) => {
  const angularToPoint = greatCircleDistanceNm(start, point) / EARTH_RADIUS_NM
  const angularLength = greatCircleDistanceNm(start, end) / EARTH_RADIUS_NM
  if (angularToPoint === 0 || angularLength === 0) {
    return greatCircleDistanceNm(start, point)
  }

  const bearingDelta =
    initialBearingRad(start, point) - initialBearingRad(start, end)
  if (Math.cos(bearingDelta) < 0) {
    return greatCircleDistanceNm(start, point)
  }

  const crossTrack = Math.asin(
    clamp(Math.sin(angularToPoint) * Math.sin(bearingDelta), -1, 1),
  )
  const alongTrack = Math.acos(
    clamp(Math.cos(angularToPoint) / Math.cos(crossTrack), -1, 1),
  )
  if (alongTrack > angularLength) {
    return greatCircleDistanceNm(end, point)
  }
  return Math.abs(crossTrack) * EARTH_RADIUS_NM
}

const pointKey = (geopoint: Geopoint & Coordinates) =>
  `${geopoint.value}|${geopoint.latitude}|${geopoint.longitude}`

const isRoutePathRole = (role: MapPointRole) => role === 'route-point'

const isOutlierCandidateRole = (role: MapPointRole) =>
  isRoutePathRole(role) || role === 'airway-waypoint'

const flagOutliers = (points: MapPoint[]): MapPoint[] => {
  const departure = points.find((point) => point.role === 'departure')
  const destination = points.find((point) => point.role === 'destination')
  if (!departure || !destination) {
    // Without both endpoints there is no corridor to judge points against.
    return points
  }

  return points.map((point) =>
    isOutlierCandidateRole(point.role) &&
    distanceToSegmentNm(point, departure, destination) > OUTLIER_DISTANCE_NM
      ? { ...point, flagged: true }
      : point,
  )
}

/**
 * Flattens a flight plan into ordered, plottable points:
 * departure, route points (with airway waypoints in supplied travel
 * order), destination, then alternates. Points without valid
 * coordinates are omitted and reported in `skipped`. Route and airway points
 * far from the departure -> destination corridor are flagged, not removed.
 */
export const buildMapPoints = (plan: FlightPlanDetail): MapPointsResult => {
  const points: MapPoint[] = []
  const skipped: string[] = []

  const addPoint = (geopoint: Geopoint, role: MapPointRole, airway?: string) => {
    if (!hasCoordinates(geopoint)) {
      skipped.push(geopoint.value)
      return
    }
    points.push({
      id: `${role}-${points.length}`,
      value: geopoint.value,
      type: geopoint.type,
      role,
      latitude: geopoint.latitude,
      longitude: geopoint.longitude,
      airway,
      flagged: false,
    })
  }

  const { departure, destination } = plan
  const destinationKey =
    destination && hasCoordinates(destination) ? pointKey(destination) : null
  let previousRouteKey =
    departure && hasCoordinates(departure) ? pointKey(departure) : null

  const addRoutePoint = (geopoint: Geopoint) => {
    if (!hasCoordinates(geopoint)) {
      skipped.push(geopoint.value)
      return
    }
    const key = pointKey(geopoint)
    // Consecutive segments share their joining fix; endpoints have own roles.
    if (key === previousRouteKey || key === destinationKey) {
      return
    }
    previousRouteKey = key
    addPoint(geopoint, 'route-point')
  }

  if (departure) {
    addPoint(departure, 'departure')
  }

  for (const segment of plan.route?.segments ?? []) {
    addRoutePoint(segment.from)
    if (segment.context?.type === 'airway') {
      const { airway, waypoints } = segment.context
      for (const waypoint of waypoints) {
        addPoint(waypoint, 'airway-waypoint', airway)
      }
    }
    addRoutePoint(segment.to)
  }

  if (destination) {
    addPoint(destination, 'destination')
  }
  for (const alternate of plan.alternates?.destination ?? []) {
    addPoint(alternate, 'destination-alternate')
  }
  for (const alternate of plan.alternates?.enroute ?? []) {
    addPoint(alternate, 'enroute-alternate')
  }

  return {
    points: flagOutliers(points),
    skipped: [...new Set(skipped)],
  }
}

/**
 * Ordered coordinates of the route line: departure, the route's own
 * from/to points, then destination. Airway waypoints, outliers and
 * alternates are not part of the line.
 */
export const buildRouteLine = (points: MapPoint[]): Coordinates[] => {
  const departure = points.find((point) => point.role === 'departure')
  const destination = points.find((point) => point.role === 'destination')
  const path = [
    ...(departure ? [departure] : []),
    ...points.filter((point) => isRoutePathRole(point.role) && !point.flagged),
    ...(destination ? [destination] : []),
  ]

  const line: Coordinates[] = []
  for (const { latitude, longitude } of path) {
    const last = line[line.length - 1]
    if (!last || last.latitude !== latitude || last.longitude !== longitude) {
      line.push({ latitude, longitude })
    }
  }
  return line
}

/**
 * Builds coordinate paths for airway-context segments. Invalid-coordinate
 * points break a path rather than being bridged by a straight line. Flagged
 * outliers are skipped, connecting the remaining fixes in airway order.
 */
export const buildAirwayLines = (plan: FlightPlanDetail): AirwayLine[] => {
  const lines: AirwayLine[] = []
  const outlierKeys = new Set(
    buildMapPoints(plan).points.filter((point) => point.flagged).map(pointKey),
  )

  for (const [segmentIndex, segment] of (plan.route?.segments ?? []).entries()) {
    if (segment.context?.type !== 'airway') continue

    const { airway, waypoints } = segment.context
    const nodes: Geopoint[] = [
      segment.from,
      // Official airway indices may decrease when the flight travels in reverse.
      ...waypoints,
      segment.to,
    ]
    let fragment: Coordinates[] = []
    let fragmentIndex = 0

    const flushFragment = () => {
      if (fragment.length >= 2) {
        lines.push({
          id: `${airway}-${segmentIndex}-${fragmentIndex}`,
          airway,
          coordinates: fragment,
        })
        fragmentIndex += 1
      }
      fragment = []
    }

    for (const node of nodes) {
      if (!hasCoordinates(node)) {
        flushFragment()
        continue
      }
      if (outlierKeys.has(pointKey(node))) continue

      const coordinate = {
        latitude: node.latitude,
        longitude: node.longitude,
      }
      const previous = fragment[fragment.length - 1]
      if (
        !previous ||
        previous.latitude !== coordinate.latitude ||
        previous.longitude !== coordinate.longitude
      ) {
        fragment.push(coordinate)
      }
    }
    flushFragment()
  }

  return lines
}

/** Sum of great-circle leg lengths along `line`, in nautical miles. */
export const lineDistanceNm = (line: Coordinates[]) =>
  line.reduce(
    (total, point, index) =>
      index === 0 ? total : total + greatCircleDistanceNm(line[index - 1], point),
    0,
  )
