import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchFlightPlanById, fetchFlightPlans } from './flightPlan'
import type { FlightPlanDetail, FlightPlanResponse } from '../types/flightPlan'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchFlightPlans', () => {
  const response: FlightPlanResponse = {
    data: [],
    pagination: {
      totalItems: 0,
      pageSize: 10,
      page: 1,
      totalPages: 0,
      cursors: { first: null, prev: null, next: null, last: null },
    },
  }

  it('sends pageSize without a cursor on the first page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })
    vi.stubGlobal('fetch', fetchMock)

    await fetchFlightPlans(null, 10)

    const params = new URL(
      String(fetchMock.mock.calls[0][0]),
      'http://localhost',
    ).searchParams
    expect([...params.entries()]).toEqual([['pageSize', '10']])
  })

  it('sends a cursor without pageSize on subsequent pages', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    })
    vi.stubGlobal('fetch', fetchMock)
    const cursor = 'eyJwYWdlIjoyLCJwYWdlU2l6ZSI6MTB9'

    await fetchFlightPlans(cursor, 10)

    const params = new URL(
      String(fetchMock.mock.calls[0][0]),
      'http://localhost',
    ).searchParams
    expect([...params.entries()]).toEqual([['cursor', cursor]])
  })
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
