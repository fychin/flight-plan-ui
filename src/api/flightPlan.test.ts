import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFlightPlanById } from './flightPlan'
import type { FlightPlanDetail } from '../types/flightPlan'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchFlightPlanById', () => {
  it('returns the flight plan detail and encodes the id', async () => {
    const detail: FlightPlanDetail = {
      id: 'a/b',
      flightIdentification: 'SIA951',
      route: null,
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(detail),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchFlightPlanById('a/b')).resolves.toEqual(detail)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/flight-plan\/a%2Fb$/)
  })

  it('throws the ErrorResponse message when the plan is not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () =>
          Promise.resolve({ error: 'Flight plan with id "abc" not found' }),
      }),
    )

    await expect(fetchFlightPlanById('abc')).rejects.toThrow(
      'Flight plan with id "abc" not found',
    )
  })

  it('falls back to the status message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    )

    await expect(fetchFlightPlanById('abc')).rejects.toThrow(
      'Request failed with status 502',
    )
  })

  it('propagates network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

    await expect(fetchFlightPlanById('abc')).rejects.toThrow('Network down')
  })
})
