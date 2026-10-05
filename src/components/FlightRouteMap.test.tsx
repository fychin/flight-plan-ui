import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRouteLegs } from '../utils/routeLegs'
import { FLIGHT_AIRWAY_LINE_STYLE, FLIGHT_LEG_HIGHLIGHT_STYLE, FLIGHT_ROUTE_LINE_STYLE } from './flightRouteMapStyles'
import type { MapViewProps } from './map/types'
import { createReverseAirwayFlightPlanDetail, createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'

const mapViewMock = vi.hoisted(() => ({ lastProps: null as MapViewProps | null }))
vi.mock('./map/MapView', () => ({
  MapView: (props: MapViewProps) => {
    mapViewMock.lastProps = props
    return <div role="region" aria-label={props.ariaLabel} />
  },
}))
import { FlightRouteMap } from './FlightRouteMap'
afterEach(cleanup)

describe('FlightRouteMap', () => {
  it('renders route markers without its own legend or controls', () => {
    render(<FlightRouteMap plan={createSampleFlightPlanDetail()} />)
    expect(mapViewMock.lastProps?.markers).toHaveLength(8)
    expect(mapViewMock.lastProps?.markers.filter((marker) => marker.flagged)).toHaveLength(2)
    expect(mapViewMock.lastProps?.lines?.[0]?.style).toEqual(FLIGHT_ROUTE_LINE_STYLE)
    expect(mapViewMock.lastProps?.lines).toHaveLength(3)
    expect(mapViewMock.lastProps?.lines?.[2]?.style).toEqual(FLIGHT_AIRWAY_LINE_STYLE)
    expect(mapViewMock.lastProps?.lines?.[0]?.label).toBe('DCT')
    expect(mapViewMock.lastProps?.lines?.[1]?.label).toBe('DCT')
    expect(mapViewMock.lastProps?.lines?.[2]?.label).toBe('G579')
    expect(mapViewMock.lastProps?.lines?.[2]?.coordinates).toEqual([
      { latitude: -5.13, longitude: 105.92 },
      { latitude: -2.88, longitude: 104.65 },
      { latitude: -0.57, longitude: 104.22 },
      { latitude: 0.27, longitude: 104.05 },
    ])
    expect(screen.queryByRole('list', { name: 'Map legend' })).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })
  it('names every airway fragment without connecting across missing coordinates', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment?.context?.type !== 'airway') throw new Error('Expected airway')
    segment.context.waypoints[0].latitude = -4
    segment.context.waypoints[0].longitude = 105
    segment.context.waypoints[1].longitude = undefined

    render(<FlightRouteMap plan={plan} />)

    const airways = mapViewMock.lastProps?.lines?.filter((line) => line.id.startsWith('airway-'))
    expect(mapViewMock.lastProps?.lines?.filter((line) => line.id.startsWith('route-')).map((line) => line.id)).toEqual([
      'route-departure', 'route-arrival',
    ])
    expect(airways).toHaveLength(2)
    expect(airways?.map((line) => line.label)).toEqual(['G579', 'G579'])
    expect(airways?.map((line) => line.coordinates)).toEqual([
      [{ latitude: -5.13, longitude: 105.92 }, { latitude: -4, longitude: 105 }],
      [{ latitude: -0.57, longitude: 104.22 }, { latitude: 0.27, longitude: 104.05 }],
    ])
  })
  it('passes reverse-travel Z650 fixes in order with labels, arrows, and matching selected geometry', () => {
    const plan = createReverseAirwayFlightPlanDetail()
    const leg = buildRouteLegs(plan)[0]
    render(<FlightRouteMap plan={plan} focusedLeg={leg} />)

    expect(mapViewMock.lastProps?.lines?.[0]).toEqual({
      id: 'airway-Z650-0-0', label: 'Z650', style: FLIGHT_AIRWAY_LINE_STYLE,
      coordinates: [
        { latitude: 47.25, longitude: 21.86 },
        { latitude: 47.2, longitude: 22.07 },
        { latitude: 47.03, longitude: 22.72 },
        { latitude: 46.92, longitude: 23.15 },
        { latitude: 46.86, longitude: 23.36 },
        { latitude: 46.76, longitude: 23.74 },
      ],
    })
    expect(mapViewMock.lastProps?.lines?.at(-1)?.coordinates).toEqual(mapViewMock.lastProps?.lines?.[0]?.coordinates)
    expect(mapViewMock.lastProps?.markers.map((marker) => marker.label)).toEqual([
      'NARKA', 'RULES', 'OBARA', 'LUNAV', 'EREDI', 'REBLA',
    ])
  })
  it('hides both alternate categories by default and follows the controlled visibility prop', () => {
    const plan = createSampleFlightPlanDetail()
    plan.alternates!.enroute = [{ value: 'ENALT', type: 'airport', latitude: -1, longitude: 105 }]
    const view = render(<FlightRouteMap plan={plan} />)
    expect(mapViewMock.lastProps?.markers.some((marker) => ['WSAP', 'ENALT'].includes(marker.label))).toBe(false)
    view.rerender(<FlightRouteMap plan={plan} showAlternates />)
    expect(mapViewMock.lastProps?.markers).toHaveLength(10)
    view.rerender(<FlightRouteMap plan={plan} showAlternates={false} />)
    expect(mapViewMock.lastProps?.markers).toHaveLength(8)
  })
  it('adds focus and a topmost highlight without rebuilding markers, then clears them', () => {
    const plan = createSampleFlightPlanDetail()
    const leg = buildRouteLegs(plan)[1]
    const view = render(<FlightRouteMap plan={plan} />)
    const markers = mapViewMock.lastProps?.markers
    view.rerender(<FlightRouteMap plan={plan} focusedLeg={leg} />)
    expect(mapViewMock.lastProps?.markers).toBe(markers)
    expect(mapViewMock.lastProps?.focus).toEqual({ key: leg.id, coordinates: leg.coordinates })
    expect(mapViewMock.lastProps?.lines?.at(-1)).toEqual({ id: 'leg-highlight', coordinates: leg.coordinates, style: FLIGHT_LEG_HIGHLIGHT_STYLE })
    view.rerender(<FlightRouteMap plan={plan} focusedLeg={null} />)
    expect(mapViewMock.lastProps?.focus).toBeNull()
    expect(mapViewMock.lastProps?.lines?.some((line) => line.id === 'leg-highlight')).toBe(false)
  })
  it('passes an alternate single-point focus and clears it without rebuilding marker inputs', () => {
    const plan = createSampleFlightPlanDetail()
    const alternate = { id: 'destination-0', latitude: 1.36, longitude: 103.9 }
    const view = render(<FlightRouteMap plan={plan} showAlternates />)
    const markers = mapViewMock.lastProps?.markers
    view.rerender(<FlightRouteMap plan={plan} showAlternates focusedAlternate={alternate} />)
    expect(mapViewMock.lastProps?.focus).toEqual({ key: 'alternate-destination-0', coordinates: [alternate] })
    expect(mapViewMock.lastProps?.markers).toBe(markers)
    view.rerender(<FlightRouteMap plan={plan} showAlternates focusedAlternate={null} />)
    expect(mapViewMock.lastProps?.focus).toBeNull()
  })

  it('shows the empty state without rendering a map when coordinates are absent', () => {
    mapViewMock.lastProps = null
    render(<FlightRouteMap plan={{ route: null }} />)
    expect(screen.getByRole('status').textContent).toContain('No coordinates available')
    expect(mapViewMock.lastProps).toBeNull()
  })
})
