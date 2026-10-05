import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import type { FlightPlanDetail } from '../types/flightPlan'
import { buildRouteLegs } from '../utils/routeLegs'
import { RouteSummary } from './RouteSummary'

afterEach(cleanup)
const renderSummary = (plan: FlightPlanDetail) => render(
  <RouteSummary plan={plan} legs={buildRouteLegs(plan)} selectedLegId={null} onSelectLeg={vi.fn()}
    showAlternates={false} onShowAlternates={vi.fn()} selectedAlternateId={null} onSelectAlternate={vi.fn()} />,
)
describe('RouteSummary', () => {
  it('renders four accessible cards with routes, alternates, timing and legend', () => {
    renderSummary(createSampleFlightPlanDetail())
    const summary = screen.getByRole('region', { name: 'Route summary' })
    expect(within(summary).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Routes', 'Alternates and airways', 'Timing and stats', 'Legend',
    ])
    expect(screen.getByText('DOLTA → REPOV')).toBeTruthy()
    expect(screen.getAllByText('G579')).toHaveLength(2)
    expect(screen.getByText('WSAP')).toBeTruthy()
    expect(screen.getByText(/^(48[1-9]|49\d) NM/)).toBeTruthy()
    expect(screen.getByText('19:25:00')).toBeTruthy()
    expect(screen.getByText('01:16:00')).toBeTruthy()
    expect(within(summary).getAllByRole('group').every((group) => group.tabIndex === 0)).toBe(true)
  })
  it('places the controlled alternate checkbox in Alternates and airways, not Legend', () => {
    const plan = createSampleFlightPlanDetail()
    const change = vi.fn()
    const view = render(<RouteSummary plan={plan} legs={buildRouteLegs(plan)} selectedLegId={null}
      onSelectLeg={vi.fn()} showAlternates={false} onShowAlternates={change} selectedAlternateId={null} onSelectAlternate={vi.fn()} />)
    const alternates = screen.getByRole('region', { name: 'Alternates and airways' })
    const checkbox = within(alternates).getByRole('checkbox', { name: 'Show alternate airports' })
    expect(checkbox.hasAttribute('checked')).toBe(false)
    expect(within(screen.getByRole('region', { name: 'Legend' })).queryByRole('checkbox')).toBeNull()
    fireEvent.click(checkbox)
    expect(change).toHaveBeenCalledWith(true)
    view.rerender(<RouteSummary plan={plan} legs={buildRouteLegs(plan)} selectedLegId={null}
      onSelectLeg={vi.fn()} showAlternates onShowAlternates={change} selectedAlternateId={null} onSelectAlternate={vi.fn()} />)
    expect((checkbox as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('Destination alternate')).toBeTruthy()
  })

  it('renders clickable alternates, selected state, and disabled missing-coordinate airports', () => {
    const plan = createSampleFlightPlanDetail()
    plan.alternates!.enroute = [{ value: 'MISSING', type: 'airport' }]
    const select = vi.fn()
    const view = render(<RouteSummary plan={plan} legs={buildRouteLegs(plan)} selectedLegId={null}
      onSelectLeg={vi.fn()} showAlternates={false} onShowAlternates={vi.fn()}
      selectedAlternateId={null} onSelectAlternate={select} />)
    const button = screen.getByRole('button', { name: 'WSAP' })
    fireEvent.click(button)
    expect(select).toHaveBeenLastCalledWith('destination-0')
    expect(screen.getByRole('button', { name: 'MISSING' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('No coordinates')).toBeTruthy()
    view.rerender(<RouteSummary plan={plan} legs={buildRouteLegs(plan)} selectedLegId={null}
      onSelectLeg={vi.fn()} showAlternates onShowAlternates={vi.fn()}
      selectedAlternateId="destination-0" onSelectAlternate={select} />)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Showing alternate airport WSAP on the map')).toBeTruthy()
    fireEvent.click(button)
    expect(select).toHaveBeenLastCalledWith(null)
  })

  it('offers a direct leg with valid endpoints even when the filed route is null', () => {
    renderSummary({ ...createSampleFlightPlanDetail(), route: null })
    expect(screen.getByText('WIII → WSSS')).toBeTruthy()
    expect(screen.getByText('None (direct)')).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Timing and route statistics' })).getByText('1')).toBeTruthy()
  })
  it('shows the no-route message and zero legs without endpoint coordinates', () => {
    renderSummary({ route: null })
    expect(screen.getByText('No route elements filed.')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
  })
})
