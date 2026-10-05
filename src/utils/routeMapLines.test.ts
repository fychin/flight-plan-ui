import { describe, expect, it } from 'vitest'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import { buildRouteMapLines } from './routeMapLines'

describe('buildRouteMapLines', () => {
  it('uses airway fixes once without a parallel endpoint connection, retaining direct terminal legs', () => {
    expect(buildRouteMapLines(createSampleFlightPlanDetail())).toEqual([
      { id: 'route-departure', coordinates: [
        { latitude: -6.12, longitude: 106.66 }, { latitude: -5.13, longitude: 105.92 },
      ] },
      { id: 'route-arrival', coordinates: [
        { latitude: 0.27, longitude: 104.05 }, { latitude: 1.36, longitude: 103.99 },
      ] },
      { id: 'airway-G579-0-0', airway: 'G579', coordinates: [
        { latitude: -5.13, longitude: 105.92 }, { latitude: -2.88, longitude: 104.65 },
        { latitude: -0.57, longitude: 104.22 }, { latitude: 0.27, longitude: 104.05 },
      ] },
    ])
  })

  it('preserves direct segments before, between, and after airway segments', () => {
    const plan = createSampleFlightPlanDetail()
    const airway = plan.route!.segments[0]
    plan.route!.segments = [
      { from: plan.departure!, to: airway.from, context: { type: 'direct' } },
      airway,
      { from: airway.to, to: { value: 'JOIN', type: 'fix', latitude: 0.7, longitude: 104 }, context: { type: 'direct' } },
      { from: { value: 'JOIN', type: 'fix', latitude: 0.7, longitude: 104 }, to: plan.destination!, context: { type: 'airway', airway: 'A1', waypoints: [] } },
    ]

    const lines = buildRouteMapLines(plan)
    expect(lines.map((line) => line.id)).toEqual([
      'route-segment-0', 'route-segment-2', 'airway-G579-1-0', 'airway-A1-3-0',
    ])
    expect(lines[1].coordinates).toEqual([
      { latitude: 0.27, longitude: 104.05 }, { latitude: 0.7, longitude: 104 },
    ])
  })

  it('does not replace missing-coordinate airway gaps with direct shortcuts', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route!.segments[0]
    if (segment.context?.type !== 'airway') throw new Error('Expected airway')
    segment.context.waypoints[1].longitude = undefined

    const lines = buildRouteMapLines(plan)
    expect(lines.map((line) => line.id)).toEqual(['route-departure', 'route-arrival', 'airway-G579-0-0'])
    expect(lines[2].coordinates).toEqual([
      { latitude: -0.57, longitude: 104.22 }, { latitude: 0.27, longitude: 104.05 },
    ])
  })

  it.each([undefined, { type: 'direct' as const }])('draws a direct connection without airway context', (context) => {
    const plan = createSampleFlightPlanDetail()
    plan.route!.segments[0].context = context

    const lines = buildRouteMapLines(plan)
    expect(lines.map((line) => line.id)).toEqual(['route-departure', 'route-segment-0', 'route-arrival'])
    expect(lines.every((line) => line.airway === undefined)).toBe(true)
    expect(lines[1].coordinates).toEqual([
      { latitude: -5.13, longitude: 105.92 }, { latitude: 0.27, longitude: 104.05 },
    ])
  })

  it('preserves the endpoint fallback for plans without segments', () => {
    const plan = createSampleFlightPlanDetail()
    plan.route = null
    expect(buildRouteMapLines(plan)).toEqual([{ id: 'route-direct', coordinates: [
      { latitude: -6.12, longitude: 106.66 }, { latitude: 1.36, longitude: 103.99 },
    ] }])
    expect(buildRouteMapLines({})).toEqual([])
  })
})
