import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { fetchFlightPlanById } from '../api/flightPlan'
import type { MapViewProps } from '../components/map/types'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import type { FlightPlanDetail } from '../types/flightPlan'
import FlightPlanDetails from './FlightPlanDetails'

vi.mock('../api/flightPlan', () => ({ fetchFlightPlanById: vi.fn() }))
const mapViewMock = vi.hoisted(() => ({ lastProps: null as MapViewProps | null }))
vi.mock('../components/map/MapView', () => ({
  MapView: (props: MapViewProps) => {
    mapViewMock.lastProps = props
    return <div role="region" aria-label={props.ariaLabel}>
      {props.markers.map((marker) => <span key={marker.id}>{marker.label}</span>)}
    </div>
  },
}))

const fetchPlanMock = vi.mocked(fetchFlightPlanById)

const deferredPlan = () => {
  let resolve: (plan: FlightPlanDetail) => void = () => {
    throw new Error('Deferred request has not been initialized')
  }
  const promise = new Promise<FlightPlanDetail>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const renderPage = () => render(
  <MemoryRouter initialEntries={['/flight-plan/first']}>
    <Link to="/flight-plan/second">Open second plan</Link>
    <Routes>
      <Route path="/flight-plan/:id" element={<FlightPlanDetails />} />
    </Routes>
  </MemoryRouter>,
)

beforeEach(() => {
  fetchPlanMock.mockReset()
})
afterEach(() => {
  cleanup()
})

describe('FlightPlanDetails', () => {
  it('shows the loading state while the API request is pending', () => {
    fetchPlanMock.mockReturnValue(deferredPlan().promise)
    renderPage()

    expect(screen.getByText('Loading flight plan…')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Route summary' })).toBeNull()
    expect(fetchPlanMock).toHaveBeenCalledWith('first', expect.any(AbortSignal))
  })

  it('shows the API error without rendering the map or summary', async () => {
    fetchPlanMock.mockRejectedValue(new Error('Flight plan not found (404)'))
    renderPage()

    expect(await screen.findByText('Flight plan not found (404)')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Flight route map' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Route summary' })).toBeNull()
  })

  it('renders the details, real flight map wrapper, and summary in order', async () => {
    fetchPlanMock.mockResolvedValue(createSampleFlightPlanDetail())
    const view = renderPage()

    expect(await screen.findByRole('heading', { name: 'SIA951' })).toBeTruthy()
    const details = view.container.querySelector('.details-summary-bar')
    if (!(details instanceof HTMLElement)) throw new Error('Expected details grid')
    expect(within(details).getByText('WIII')).toBeTruthy()
    expect(within(details).getByText('WSSS')).toBeTruthy()
    expect(within(details).getByText('B772')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Back to flight plans/ })).toBeNull()
    expect(within(details).getByText('WIII').closest('.details-summary-airport--departure')).toBeTruthy()
    expect(within(details).getByText('WSSS').closest('.details-summary-airport--destination')).toBeTruthy()

    const map = await screen.findByRole('region', { name: 'Map of route for SIA951' })
    const summary = screen.getByRole('region', { name: 'Route summary' })
    expect(map.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(summary).getByRole('region', { name: 'Legend' })).toBeTruthy()
    expect(within(summary).getByRole('list', { name: 'Map legend' })).toBeTruthy()
    expect(within(summary).getByRole('region', { name: 'Routes' })).toBeTruthy()
    expect(mapViewMock.lastProps?.markers.filter((marker) => marker.flagged).map((marker) => marker.label)).toEqual(['DOMIL', 'FIR11'])
    expect(mapViewMock.lastProps?.lines?.map((line) => line.id)).toEqual([
      'route-departure', 'route-arrival', 'airway-G579-0-0',
    ])
    expect(mapViewMock.lastProps?.lines?.[2]).toMatchObject({
      label: 'G579', style: { width: 7, arrows: true },
    })
    expect(within(summary).getByText('DOLTA → REPOV')).toBeTruthy()
    expect(within(summary).getAllByText('G579')).toHaveLength(2)
  })

  it('preserves optional-value and map empty states', async () => {
    fetchPlanMock.mockResolvedValue({ route: null })
    const view = renderPage()

    expect(await screen.findByText('No coordinates available to plot.')).toBeTruthy()
    expect(screen.getByText('No route elements filed.')).toBeTruthy()
    const details = view.container.querySelector('.details-summary-bar')
    if (!(details instanceof HTMLElement)) throw new Error('Expected details grid')
    expect(within(details).getAllByText('—')).toHaveLength(6)
  })

  it('uses the alternates checkbox to control markers and resets alternate focus on plan change', async () => {
    fetchPlanMock.mockResolvedValue(createSampleFlightPlanDetail())
    renderPage()
    await screen.findByRole('region', { name: 'Map of route for SIA951' })
    expect(mapViewMock.lastProps?.markers.some((marker) => marker.label === 'WSAP')).toBe(false)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show alternate airports' }))
    expect(mapViewMock.lastProps?.markers.some((marker) => marker.label === 'WSAP')).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'WSAP' }))
    fireEvent.click(screen.getByRole('link', { name: 'Open second plan' }))
    await screen.findByRole('region', { name: 'Map of route for SIA951' })
    expect(mapViewMock.lastProps?.markers.some((marker) => marker.label === 'WSAP')).toBe(false)
    expect(mapViewMock.lastProps?.focus).toBeNull()
  })

  it('focuses a clicked alternate, reveals markers, toggles off, and clears focus when hidden', async () => {
    fetchPlanMock.mockResolvedValue(createSampleFlightPlanDetail())
    renderPage()
    await screen.findByRole('region', { name: 'Map of route for SIA951' })
    const alternates = screen.getByRole('region', { name: 'Alternates and airways' })
    const button = within(alternates).getByRole('button', { name: 'WSAP' })
    fireEvent.click(screen.getByRole('button', { name: /DOLTA → REPOV/ }))
    fireEvent.click(button)
    expect(mapViewMock.lastProps?.focus).toMatchObject({
      key: 'alternate-destination-0', coordinates: [{ latitude: 1.36, longitude: 103.9 }],
    })
    expect(mapViewMock.lastProps?.markers.some((marker) => marker.label === 'WSAP')).toBe(true)
    expect(mapViewMock.lastProps?.lines?.some((line) => line.id === 'leg-highlight')).toBe(false)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(mapViewMock.lastProps?.focus).toBeNull()
    fireEvent.click(button)
    fireEvent.click(within(alternates).getByRole('checkbox', { name: 'Show alternate airports' }))
    expect(mapViewMock.lastProps?.focus).toBeNull()
    expect(mapViewMock.lastProps?.markers.some((marker) => marker.label === 'WSAP')).toBe(false)
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: /DOLTA → REPOV/ }))
    expect(mapViewMock.lastProps?.focus?.key).toBe('segment-0')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('focuses and highlights a clicked leg, toggles off, and restores the full route', async () => {
    fetchPlanMock.mockResolvedValue(createSampleFlightPlanDetail())
    renderPage()
    await screen.findByRole('region', { name: 'Map of route for SIA951' })
    const leg = screen.getByRole('button', { name: /DOLTA → REPOV/ })
    fireEvent.click(leg)
    expect(mapViewMock.lastProps?.focus?.key).toBe('segment-0')
    expect(mapViewMock.lastProps?.lines?.at(-1)?.id).toBe('leg-highlight')
    fireEvent.click(leg)
    expect(mapViewMock.lastProps?.focus).toBeNull()
    expect(mapViewMock.lastProps?.lines?.some((line) => line.id === 'leg-highlight')).toBe(false)
    fireEvent.click(leg)
    fireEvent.click(screen.getByRole('button', { name: 'Show full route' }))
    expect(mapViewMock.lastProps?.focus).toBeNull()
  })

  it('resets selection when loading another plan, even with the same payload id', async () => {
    fetchPlanMock.mockResolvedValue(createSampleFlightPlanDetail())
    renderPage()
    await screen.findByRole('region', { name: 'Map of route for SIA951' })
    fireEvent.click(screen.getByRole('button', { name: /DOLTA → REPOV/ }))
    fireEvent.click(screen.getByRole('link', { name: 'Open second plan' }))
    await screen.findByRole('region', { name: 'Map of route for SIA951' })
    expect(screen.getByRole('button', { name: /DOLTA → REPOV/ }).getAttribute('aria-pressed')).toBe('false')
    expect(mapViewMock.lastProps?.focus).toBeNull()
  })

  it('aborts the previous request when the route id changes and ignores a stale success', async () => {
    const firstRequest = deferredPlan()
    const secondRequest = deferredPlan()
    fetchPlanMock.mockReturnValueOnce(firstRequest.promise).mockReturnValueOnce(secondRequest.promise)
    const view = renderPage()
    const firstSignal = fetchPlanMock.mock.calls[0]?.[1]
    expect(firstSignal?.aborted).toBe(false)

    fireEvent.click(screen.getByRole('link', { name: 'Open second plan' }))
    await waitFor(() => expect(fetchPlanMock).toHaveBeenCalledTimes(2))
    expect(firstSignal?.aborted).toBe(true)
    const secondSignal = fetchPlanMock.mock.calls[1]?.[1]
    expect(fetchPlanMock.mock.calls[1]?.[0]).toBe('second')
    expect(secondSignal?.aborted).toBe(false)

    await act(async () => {
      secondRequest.resolve({ ...createSampleFlightPlanDetail(), flightIdentification: 'SECOND' })
    })
    expect(await screen.findByRole('heading', { name: 'SECOND' })).toBeTruthy()

    await act(async () => {
      firstRequest.resolve({ ...createSampleFlightPlanDetail(), flightIdentification: 'STALE' })
    })
    expect(screen.queryByRole('heading', { name: 'STALE' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'SECOND' })).toBeTruthy()

    view.unmount()
    expect(secondSignal?.aborted).toBe(true)
  })
})
