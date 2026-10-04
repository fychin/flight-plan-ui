import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildRouteLegs } from '../utils/routeLegs'
import { FLIGHT_AIRWAY_LINE_STYLE, FLIGHT_LEG_HIGHLIGHT_STYLE, FLIGHT_ROUTE_LINE_STYLE } from './flightRouteMapStyles'
import type { MapViewProps } from './map/types'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'

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
  it('renders route markers and outlier notes without its own legend or controls', () => {
    render(<FlightRouteMap plan={createSampleFlightPlanDetail()} />)
    expect(screen.getByText(/DOMIL, FIR11/)).toBeTruthy()
    expect(mapViewMock.lastProps?.markers).toHaveLength(8)
    expect(mapViewMock.lastProps?.markers.filter((marker) => marker.flagged)).toHaveLength(2)
    expect(mapViewMock.lastProps?.lines?.[0]?.style).toEqual(FLIGHT_ROUTE_LINE_STYLE)
    expect(mapViewMock.lastProps?.lines?.[1]?.style).toEqual(FLIGHT_AIRWAY_LINE_STYLE)
    expect(screen.queryByRole('list', { name: 'Map legend' })).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
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
  it('reports missing coordinates', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (segment?.context?.type !== 'airway') throw new Error('Expected airway')
    segment.context.waypoints[0].latitude = undefined
    render(<FlightRouteMap plan={plan} />)
    expect(screen.getByText(/Not plotted \(missing coordinates\): DOMIL/)).toBeTruthy()
  })
})
