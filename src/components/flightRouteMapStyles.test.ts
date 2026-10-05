import { describe, expect, it } from 'vitest'
import { buildMapPoints } from '../utils/routeGeo'
import type { MapPoint } from '../utils/routeGeo'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import { resolveFlightMapPointStyle, FLIGHT_ROUTE_LINE_STYLE, FLIGHT_AIRWAY_LINE_STYLE, FLIGHT_LEG_HIGHLIGHT_STYLE } from './flightRouteMapStyles'

const point: MapPoint = { id: 'fix', value: 'FIX', latitude: 1, longitude: 2, role: 'route-point', type: 'fix', flagged: false }
describe('flight route styles', () => {
  it('distinguishes endpoints by text and color and sizes markers by importance', () => {
    const styles = buildMapPoints(createSampleFlightPlanDetail()).points.map(resolveFlightMapPointStyle)
    expect(styles[0]).toMatchObject({ legendLabel: 'Departure', style: { shape: 'pill', badge: 'DEP', size: 30 } })
    const destination = styles.find((style) => style.legendLabel === 'Destination')
    expect(destination).toMatchObject({ style: { shape: 'pill', badge: 'DEST', size: 30 } })
    expect(destination?.style.color).not.toBe(styles[0].style.color)
    expect(styles.find((style) => style.legendLabel === 'Destination alternate')).toMatchObject({ style: { shape: 'diamond', badge: 'ALT', size: 24 } })
    expect(styles.find((style) => style.legendLabel === 'Route fix')).toMatchObject({ style: { size: 12, fillColor: '#ffffff' } })
    expect(styles.find((style) => style.legendLabel.startsWith('Airway waypoint'))).toMatchObject({ style: { size: 7 } })
  })
  it('keeps feature type distinct from role, with triangle and square fallbacks', () => {
    expect(resolveFlightMapPointStyle({ ...point, type: 'navaid' }).style.shape).toBe('triangle')
    expect(resolveFlightMapPointStyle({ ...point, type: null }).style.shape).toBe('square')
    expect(resolveFlightMapPointStyle({ ...point, role: 'enroute-alternate' })).toMatchObject({ legendLabel: 'Enroute alternate', style: { badge: 'ALT', shape: 'diamond' } })
  })
  it('uses solid cased paths with arrows and a thicker airway route', () => {
    expect(FLIGHT_ROUTE_LINE_STYLE).toMatchObject({ color: '#b90078', casingColor: '#ffffff', arrows: true })
    expect(FLIGHT_LEG_HIGHLIGHT_STYLE).toMatchObject({ color: '#ffc247', casingColor: '#342800', arrows: true })
    expect(FLIGHT_AIRWAY_LINE_STYLE).toMatchObject({ casingColor: '#ffffff', arrows: true })
    expect(FLIGHT_AIRWAY_LINE_STYLE.width).toBeGreaterThan(FLIGHT_ROUTE_LINE_STYLE.width)
    expect(FLIGHT_AIRWAY_LINE_STYLE).not.toHaveProperty('dasharray')
    expect(FLIGHT_LEG_HIGHLIGHT_STYLE.width).toBeGreaterThan(FLIGHT_AIRWAY_LINE_STYLE.width)
  })
})
