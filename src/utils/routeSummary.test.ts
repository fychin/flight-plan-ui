import { describe, expect, it } from 'vitest'
import { createSampleFlightPlanDetail } from '../test/flightPlanDetailFixture'
import { formatDistanceNm, getAirways } from './routeSummary'

describe('getAirways', () => {
  it('returns unique airway names in first-use order', () => {
    const plan = createSampleFlightPlanDetail()
    const segment = plan.route?.segments[0]
    if (!segment) throw new Error('Expected sample segment')
    plan.route?.segments.push({ ...segment })
    expect(getAirways(plan)).toEqual(['G579'])
  })
  it('returns no airways for a missing route', () => {
    expect(getAirways({ route: null })).toEqual([])
  })
})

describe('formatDistanceNm', () => {
  it('rounds the distance and adds nautical-mile units', () => {
    expect(formatDistanceNm(481.7)).toBe('482 NM')
  })
})
