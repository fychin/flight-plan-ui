import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import { FlightMapLegend } from './FlightMapLegend'
afterEach(cleanup)

describe('FlightMapLegend', () => {
  it('renders categories reflecting alternate visibility without a checkbox', () => {
    const plan = createSampleFlightPlanDetail()
    plan.alternates!.enroute = [{ value: 'ENALT', type: 'airport', latitude: -1, longitude: 105 }]
    const view = render(<FlightMapLegend plan={plan} showAlternates={false} hasFocusedLeg={false} />)
    expect(screen.getByRole('region', { name: 'Legend' })).toBeTruthy()
    expect(screen.getByText('Departure')).toBeTruthy()
    expect(screen.getByText('Destination')).toBeTruthy()
    expect(screen.getByText('Filed route (direct)')).toBeTruthy()
    const airwayEntry = screen.getByText('Airway route: G579').closest('li')
    const airwaySwatch = airwayEntry?.querySelector<HTMLElement>('.flight-map-legend__swatch')
    expect(airwaySwatch?.style.getPropertyValue('--swatch-width')).toBe('7px')
    expect(airwaySwatch?.classList.contains('flight-map-legend__swatch--dashed')).toBe(false)
    expect(screen.queryByText('Destination alternate')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    view.rerender(<FlightMapLegend plan={plan} showAlternates hasFocusedLeg />)
    expect(screen.getByText('Destination alternate')).toBeTruthy()
    expect(screen.getByText('Enroute alternate')).toBeTruthy()
    expect(screen.getByText('Selected leg')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Map legend details' }).tabIndex).toBe(0)
    view.rerender(<FlightMapLegend plan={plan} showAlternates={false} hasFocusedLeg={false} />)
    expect(screen.queryByText('Selected leg')).toBeNull()
  })
  it('only shows the airway route when no direct legs are drawn', () => {
    const plan = createSampleFlightPlanDetail()
    plan.departure = { ...plan.route!.segments[0].from }
    plan.destination = { ...plan.route!.segments[0].to }
    render(<FlightMapLegend plan={plan} showAlternates={false} hasFocusedLeg={false} />)

    expect(screen.getByText('Airway route: G579')).toBeTruthy()
    expect(screen.queryByText('Filed route (direct)')).toBeNull()
  })
  it('shows the empty state', () => {
    render(<FlightMapLegend plan={{}} showAlternates={false} hasFocusedLeg={false} />)
    expect(screen.getByText('No map features available.')).toBeTruthy()
  })
})
