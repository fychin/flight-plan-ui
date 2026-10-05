import { describe, expect, it } from 'vitest'
import { createReverseAirwayFlightPlanDetail, createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import { buildAirwayLines, buildMapPoints, lineDistanceNm } from './routeGeo'
import { buildRouteLegs } from './routeLegs'

describe('buildRouteLegs', () => {
  it('builds sample terminal and airway legs, excluding corridor outliers', () => {
    const plan = createSampleFlightPlanDetail()
    const legs = buildRouteLegs(plan)
    expect(legs.map(({ id, sequence, from, to, via, label }) => ({ id, sequence, from, to, via, label }))).toEqual([
      { id: 'departure', sequence: 1, from: 'WIII', to: 'DOLTA', via: 'DCT', label: 'Departure' },
      { id: 'segment-0', sequence: 2, from: 'DOLTA', to: 'REPOV', via: 'G579', label: undefined },
      { id: 'arrival', sequence: 3, from: 'REPOV', to: 'WSSS', via: 'DCT', label: 'Arrival' },
    ])
    expect(legs[1].outlierCount).toBe(2)
    expect(legs[1].coordinates).toEqual([
      { latitude: -5.13, longitude: 105.92 }, { latitude: -2.88, longitude: 104.65 },
      { latitude: -0.57, longitude: 104.22 }, { latitude: 0.27, longitude: 104.05 },
    ])
    expect(legs[1].distanceNm).toBe(lineDistanceNm(legs[1].coordinates))
    expect(legs.every((leg) => leg.plottable)).toBe(true)
  })
  it('agrees with buildMapPoints flags for every sample airway waypoint', () => {
    const plan = createSampleFlightPlanDetail()
    const { points } = buildMapPoints(plan)
    const leg = buildRouteLegs(plan)[1]
    for (const point of points.filter((point) => point.role === 'airway-waypoint')) {
      expect(leg.coordinates.some((coordinate) => coordinate.latitude === point.latitude && coordinate.longitude === point.longitude)).toBe(!point.flagged)
    }
    expect(leg.outlierCount).toBe(points.filter((point) => point.flagged).length)
  })
  it('preserves reverse airway travel order without mutating input and carries speed/level', () => {
    const plan = createReverseAirwayFlightPlanDetail()
    const segment = plan.route!.segments[0]
    segment.from.speed = 'N0488'
    segment.from.flightLevel = 'F360'
    if (segment.context?.type !== 'airway') throw new Error('Expected airway')
    const before = [...segment.context.waypoints]
    const leg = buildRouteLegs(plan)[0]
    expect(leg.speed).toBe('N0488')
    expect(leg.flightLevel).toBe('F360')
    expect(leg.coordinates[1]).toEqual({ latitude: 47.2, longitude: 22.07 })
    expect(leg.coordinates).toEqual(buildAirwayLines(plan)[0]?.coordinates)
    expect(segment.context.waypoints).toEqual(before)
  })
  it.each([undefined, { type: 'direct' as const }])('uses DCT without airway context', (context) => {
    const plan = createSampleFlightPlanDetail()
    plan.route!.segments[0].context = context
    expect(buildRouteLegs(plan)[1].via).toBe('DCT')
    expect(buildRouteLegs(plan)[1].coordinates).toHaveLength(2)
  })
  it.each([null, { segments: [] }, undefined])('offers an endpoint direct fallback for an empty route', (route) => {
    const plan = { ...createSampleFlightPlanDetail(), route }
    expect(buildRouteLegs(plan)).toMatchObject([{ id: 'direct', from: 'WIII', to: 'WSSS', via: 'DCT', plottable: true }])
    expect(buildRouteLegs({ route })).toEqual([])
  })
  it('does not duplicate terminal identifiers or add terminals with missing coordinates', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route!.segments[0]
    plan.departure = { ...segment.from }
    plan.destination = { ...segment.to }
    expect(buildRouteLegs(plan)).toHaveLength(1)
    plan.departure = { value: 'MISSING', type: 'airport' }
    plan.destination = undefined
    expect(buildRouteLegs(plan)).toHaveLength(1)
  })
  it('disables paths with missing, invalid, or fewer than two distinct coordinates', () => {
    const point = { value: 'A', type: 'fix' as const, latitude: 1, longitude: 2 }
    expect(buildRouteLegs({ route: { segments: [
      { from: point, to: { value: 'B', type: 'fix', latitude: NaN } },
      { from: point, to: { ...point, value: 'C' } },
    ] } }).map((leg) => leg.plottable)).toEqual([false, false])
  })
  it('does not classify outliers without both endpoint coordinates', () => {
    const plan = createSampleFlightPlanDetail()
    plan.departure = undefined
    expect(buildRouteLegs(plan)[0].outlierCount).toBe(0)
    expect(buildRouteLegs(plan)[0].coordinates).toHaveLength(6)
  })
})
