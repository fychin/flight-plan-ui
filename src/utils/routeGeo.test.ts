import { describe, expect, it } from 'vitest'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import type { FlightPlanDetail } from '../types/flightPlan'
import {
  buildAirwayLines,
  buildMapPoints,
  buildRouteLine,
  distanceToSegmentNm,
  greatCircleDistanceNm,
  hasCoordinates,
  lineDistanceNm,
} from './routeGeo'

describe('hasCoordinates', () => {
  it('accepts finite in-range coordinates', () => {
    expect(
      hasCoordinates({ value: 'A', type: 'fix', latitude: 0, longitude: 0 }),
    ).toBe(true)
  })

  it.each([
    ['missing latitude', { longitude: 10 }],
    ['missing longitude', { latitude: 10 }],
    ['NaN', { latitude: Number.NaN, longitude: 10 }],
    ['latitude out of range', { latitude: 91, longitude: 10 }],
    ['longitude out of range', { latitude: 10, longitude: -181 }],
  ])('rejects %s', (_label, coords) => {
    expect(hasCoordinates({ value: 'A', type: 'fix', ...coords })).toBe(false)
  })
})

describe('greatCircleDistanceNm', () => {
  it('is zero for identical points', () => {
    const point = { latitude: 1.36, longitude: 103.99 }
    expect(greatCircleDistanceNm(point, point)).toBe(0)
  })

  it('measures WIII to WSSS at roughly 480 NM', () => {
    const distance = greatCircleDistanceNm(
      { latitude: -6.12, longitude: 106.66 },
      { latitude: 1.36, longitude: 103.99 },
    )
    expect(distance).toBeGreaterThan(470)
    expect(distance).toBeLessThan(500)
  })

  it('measures one degree of latitude as about 60 NM', () => {
    const distance = greatCircleDistanceNm(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    )
    expect(distance).toBeCloseTo(60, 0)
  })
})

describe('distanceToSegmentNm', () => {
  const start = { latitude: 0, longitude: 0 }
  const end = { latitude: 0, longitude: 10 }

  it('measures cross-track distance to the segment', () => {
    expect(
      distanceToSegmentNm({ latitude: 1, longitude: 5 }, start, end),
    ).toBeCloseTo(60, 0)
  })

  it('uses the nearest end when the point lies beyond the segment', () => {
    const beyondEnd = { latitude: 0, longitude: 12 }
    expect(distanceToSegmentNm(beyondEnd, start, end)).toBeCloseTo(
      greatCircleDistanceNm(end, beyondEnd),
      6,
    )
    const beforeStart = { latitude: 0, longitude: -3 }
    expect(distanceToSegmentNm(beforeStart, start, end)).toBeCloseTo(
      greatCircleDistanceNm(start, beforeStart),
      6,
    )
  })
})

describe('buildMapPoints', () => {
  it('orders points: departure, route, airway waypoints by index, destination, alternates', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment?.context?.type === 'airway') {
      segment.context.waypoints.reverse()
    }

    const { points, skipped } = buildMapPoints(plan)

    expect(points.map((point) => point.value)).toEqual([
      'WIII',
      'DOLTA',
      'DOMIL',
      'PLB',
      'PARDI',
      'FIR11',
      'REPOV',
      'WSSS',
      'WSAP',
    ])
    expect(points.map((point) => point.role)).toEqual([
      'departure',
      'route-point',
      'airway-waypoint',
      'airway-waypoint',
      'airway-waypoint',
      'airway-waypoint',
      'route-point',
      'destination',
      'destination-alternate',
    ])
    expect(points.find((point) => point.value === 'DOLTA')?.type).toBe('fix')
    expect(points.find((point) => point.value === 'PLB')?.type).toBe('navaid')
    expect(skipped).toEqual([])
  })

  it('gives every point a unique id and tags airway waypoints with their airway', () => {
    const { points } = buildMapPoints(createSampleFlightPlanDetail())

    expect(new Set(points.map((point) => point.id)).size).toBe(points.length)
    expect(
      points.filter((point) => point.airway === 'G579').map((p) => p.value),
    ).toEqual(['DOMIL', 'PLB', 'PARDI', 'FIR11'])
  })

  it('flags only far-away airway waypoints as outliers', () => {
    const { points } = buildMapPoints(createSampleFlightPlanDetail())

    expect(
      points.filter((point) => point.flagged).map((point) => point.value),
    ).toEqual(['DOMIL', 'FIR11'])
  })

  it('never flags the endpoints or alternates', () => {
    const { points } = buildMapPoints(createSampleFlightPlanDetail())

    const flaggedRoles = points
      .filter((point) => point.flagged)
      .map((point) => point.role)
    expect(flaggedRoles).not.toContain('departure')
    expect(flaggedRoles).not.toContain('destination')
    expect(flaggedRoles).not.toContain('destination-alternate')
  })

  it('plots only departure, destination and alternates when route is null', () => {
    const plan: FlightPlanDetail = { ...createSampleFlightPlanDetail(), route: null }

    expect(buildMapPoints(plan).points.map((point) => point.value)).toEqual([
      'WIII',
      'WSSS',
      'WSAP',
    ])
  })

  it('plots the route endpoints for a direct segment without extra points', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment) {
      segment.context = { type: 'direct' }
    }

    expect(buildMapPoints(plan).points.map((point) => point.value)).toEqual([
      'WIII',
      'DOLTA',
      'REPOV',
      'WSSS',
      'WSAP',
    ])
  })

  it('treats a missing route and missing alternates as empty', () => {
    const plan: FlightPlanDetail = {
      departure: { value: 'WIII', type: 'airport', latitude: -6.12, longitude: 106.66 },
      destination: { value: 'WSSS', type: 'airport', latitude: 1.36, longitude: 103.99 },
    }

    expect(buildMapPoints(plan).points.map((point) => point.value)).toEqual([
      'WIII',
      'WSSS',
    ])
  })

  it('drops points without valid coordinates and reports them once', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment?.context?.type === 'airway') {
      delete segment.context.waypoints[1].latitude
      segment.context.waypoints[2].longitude = 999
    }
    delete segment?.to.longitude

    const { points, skipped } = buildMapPoints(plan)

    expect(points.map((point) => point.value)).not.toContain('PLB')
    expect(points.map((point) => point.value)).not.toContain('PARDI')
    expect(points.map((point) => point.value)).not.toContain('REPOV')
    expect(skipped).toEqual(['PLB', 'PARDI', 'REPOV'])
  })

  it('does not duplicate the fix shared by consecutive segments', () => {
    const plan = createSampleFlightPlanDetail()
    const first = plan.route?.segments[0]
    if (first) {
      first.context = { type: 'direct' }
      plan.route?.segments.push({
        from: { ...first.to },
        to: { value: 'ABCDE', type: 'fix', latitude: 1, longitude: 104 },
        context: { type: 'direct' },
      })
    }

    expect(
      buildMapPoints(plan).points.filter((point) => point.value === 'REPOV'),
    ).toHaveLength(1)
  })

  it('does not flag anything when the departure is missing', () => {
    const plan = createSampleFlightPlanDetail()
    delete plan.departure

    expect(
      buildMapPoints(plan).points.some((point) => point.flagged),
    ).toBe(false)
  })
})

describe('buildRouteLine', () => {
  it('goes departure -> route points -> destination, excluding outliers and airway waypoints', () => {
    const { points } = buildMapPoints(createSampleFlightPlanDetail())

    expect(buildRouteLine(points)).toEqual([
      { latitude: -6.12, longitude: 106.66 },
      { latitude: -5.13, longitude: 105.92 },
      { latitude: 0.27, longitude: 104.05 },
      { latitude: 1.36, longitude: 103.99 },
    ])
  })

  it('returns an empty line when there are no points', () => {
    expect(buildRouteLine([])).toEqual([])
  })
})

describe('buildAirwayLines', () => {
  it('builds an ordered airway path including segment endpoints and sorted waypoints', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment?.context?.type === 'airway') {
      segment.context.waypoints.reverse()
    }

    const [airwayLine] = buildAirwayLines(plan)
    expect(airwayLine?.airway).toBe('G579')
    expect(airwayLine?.coordinates).toEqual([
      { latitude: -5.13, longitude: 105.92 },
      { latitude: 46.96, longitude: 6.31 },
      { latitude: -2.88, longitude: 104.65 },
      { latitude: -0.57, longitude: 104.22 },
      { latitude: 17.83, longitude: -89.45 },
      { latitude: 0.27, longitude: 104.05 },
    ])
  })

  it('retains flagged airway outliers in the distinct airway geometry', () => {
    const { points } = buildMapPoints(createSampleFlightPlanDetail())
    const flaggedValues = points.filter((point) => point.flagged).map((point) => point.value)
    const [airwayLine] = buildAirwayLines(createSampleFlightPlanDetail())

    expect(flaggedValues).toEqual(['DOMIL', 'FIR11'])
    expect(airwayLine?.coordinates).toContainEqual({
      latitude: 46.96,
      longitude: 6.31,
    })
    expect(airwayLine?.coordinates).toContainEqual({
      latitude: 17.83,
      longitude: -89.45,
    })
  })

  it('returns no airway paths for a direct-only route', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment) segment.context = { type: 'direct' }

    expect(buildAirwayLines(plan)).toEqual([])
  })

  it('breaks paths at missing coordinates and omits fragments with fewer than two points', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment?.context?.type === 'airway') {
      const missingCoordinateWaypoint = segment.context.waypoints.find(
        (waypoint) => waypoint.indexInAirway === 3,
      )
      if (missingCoordinateWaypoint) delete missingCoordinateWaypoint.longitude
    }

    const lines = buildAirwayLines(plan)
    expect(lines.map((line) => line.coordinates)).toEqual([
      [
        { latitude: -5.13, longitude: 105.92 },
        { latitude: 46.96, longitude: 6.31 },
      ],
      [
        { latitude: -0.57, longitude: 104.22 },
        { latitude: 17.83, longitude: -89.45 },
        { latitude: 0.27, longitude: 104.05 },
      ],
    ])
  })
})

describe('lineDistanceNm', () => {
  it('is zero for fewer than two points', () => {
    expect(lineDistanceNm([])).toBe(0)
    expect(lineDistanceNm([{ latitude: 1, longitude: 1 }])).toBe(0)
  })

  it('sums the legs of the sample route', () => {
    const { points } = buildMapPoints(createSampleFlightPlanDetail())
    const distance = lineDistanceNm(buildRouteLine(points))

    expect(distance).toBeGreaterThan(480)
    expect(distance).toBeLessThan(500)
  })
})
