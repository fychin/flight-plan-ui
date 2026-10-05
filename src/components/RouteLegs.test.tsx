import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import { buildRouteLegs } from '../utils/routeLegs'
import { RouteLegs } from './RouteLegs'

afterEach(cleanup)
const legs = buildRouteLegs(createSampleFlightPlanDetail())

describe('RouteLegs', () => {
  it('exposes selection, toggles off, resets, and announces the viewport', () => {
    const select = vi.fn()
    const view = render(<RouteLegs legs={legs} selectedLegId={null} onSelectLeg={select} />)
    const button = screen.getByRole('button', { name: /DOLTA → REPOV/ })
    expect(button.getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Show full route' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(select).toHaveBeenLastCalledWith('segment-0')
    view.rerender(<RouteLegs legs={legs} selectedLegId="segment-0" onSelectLeg={select} />)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('✓ Selected')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Showing DOLTA → REPOV on the map')
    fireEvent.click(button)
    expect(select).toHaveBeenLastCalledWith(null)
    fireEvent.click(screen.getByRole('button', { name: 'Show full route' }))
    expect(select).toHaveBeenLastCalledWith(null)
    view.rerender(<RouteLegs legs={legs} selectedLegId={null} onSelectLeg={select} />)
    expect(screen.getByRole('status').textContent).toBe('Showing full route')
  })
  it('disables an unplottable leg and shows the reason and outlier count', () => {
    const select = vi.fn()
    render(<RouteLegs legs={[{ ...legs[1], plottable: false }]} selectedLegId={null} onSelectLeg={select} />)
    const button = screen.getByRole('button', { name: /No coordinates/ })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('2 outlier waypoints not shown')).toBeTruthy()
    fireEvent.click(button)
    expect(select).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Routes list' }).tabIndex).toBe(0)
  })
  it('shows an empty message', () => {
    render(<RouteLegs legs={[]} selectedLegId={null} onSelectLeg={vi.fn()} />)
    expect(screen.getByText('No route elements filed.')).toBeTruthy()
  })
  it('scrolls the selected item into view and honors reduced motion', () => {
    const scroll = vi.fn()
    const original = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = scroll
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    render(<RouteLegs legs={legs} selectedLegId="segment-0" onSelectLeg={vi.fn()} />)
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest', behavior: 'instant' })
    HTMLElement.prototype.scrollIntoView = original
    vi.unstubAllGlobals()
  })
})
