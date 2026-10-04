import type { FlightPlanDetail } from '../types/flightPlan'

/**
 * Sample `GET /api/flight-plan/:id` response. DOMIL and FIR11 are real
 * outliers in this payload: they sit thousands of nautical miles away from
 * the WIII -> WSSS corridor.
 */
export const createSampleFlightPlanDetail = (): FlightPlanDetail => ({
  id: '66eae75f1fee5ea33feac2bc',
  flightIdentification: 'SIA951',
  aircraft: 'B772',
  departure: { value: 'WIII', type: 'airport', latitude: -6.12, longitude: 106.66 },
  destination: { value: 'WSSS', type: 'airport', latitude: 1.36, longitude: 103.99 },
  alternates: {
    destination: [
      { value: 'WSAP', type: 'airport', latitude: 1.36, longitude: 103.9 },
    ],
    enroute: [],
  },
  timing: {
    eobt: '19:25:00',
    estimatedArrival: '2024-09-18T20:41:00.000Z',
    estimatedElapsedTime: '01:16:00',
  },
  route: {
    segments: [
      {
        from: { value: 'DOLTA', type: 'fix', latitude: -5.13, longitude: 105.92 },
        to: { value: 'REPOV', type: 'fix', latitude: 0.27, longitude: 104.05 },
        context: {
          type: 'airway',
          airway: 'G579',
          waypoints: [
            { value: 'DOMIL', type: 'fix', latitude: 46.96, longitude: 6.31, indexInAirway: 2 },
            { value: 'PLB', type: 'navaid', latitude: -2.88, longitude: 104.65, indexInAirway: 3 },
            { value: 'PARDI', type: 'fix', latitude: -0.57, longitude: 104.22, indexInAirway: 4 },
            { value: 'FIR11', type: 'fix', latitude: 17.83, longitude: -89.45, indexInAirway: 5 },
          ],
        },
      },
    ],
  },
})
