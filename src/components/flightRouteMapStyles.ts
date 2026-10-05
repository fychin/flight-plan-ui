import type { MapMarker } from './map/types'
import type { MapPoint } from '../utils/routeGeo'

export type FlightMapPointStyle = {
  style: MapMarker['style']
  legendLabel: string
}

const DEPARTURE_STYLE = { color: '#176b3a', shape: 'pill', size: 30, badge: 'DEP' } as const
const DESTINATION_STYLE = { color: '#003e7a', shape: 'pill', size: 30, badge: 'DEST' } as const
const DESTINATION_ALTERNATE_STYLE = { color: '#6840a0', shape: 'diamond', size: 24, badge: 'ALT' } as const
const ENROUTE_ALTERNATE_STYLE = { color: '#895600', shape: 'diamond', size: 24, badge: 'ALT' } as const
const FIX_STYLE = { color: '#273444', fillColor: '#ffffff', shape: 'circle', size: 12 } as const
const NAVAID_STYLE = { color: '#273444', shape: 'triangle', size: 16 } as const
const FALLBACK_STYLE = { color: '#46596b', shape: 'square', size: 12 } as const
const AIRWAY_WAYPOINT_STYLE = { color: '#006d68', shape: 'circle', size: 7 } as const

export const resolveFlightMapPointStyle = (point: MapPoint): FlightMapPointStyle => {
  switch (point.role) {
    case 'departure':
      return { style: DEPARTURE_STYLE, legendLabel: 'Departure' }
    case 'destination':
      return { style: DESTINATION_STYLE, legendLabel: 'Destination' }
    case 'destination-alternate':
      return { style: DESTINATION_ALTERNATE_STYLE, legendLabel: 'Destination alternate' }
    case 'enroute-alternate':
      return { style: ENROUTE_ALTERNATE_STYLE, legendLabel: 'Enroute alternate' }
    case 'airway-waypoint':
      return {
        style: AIRWAY_WAYPOINT_STYLE,
        legendLabel: `Airway waypoint${point.airway ? ` (${point.airway})` : ''}`,
      }
    case 'route-point':
      if (point.type === 'fix') {
        return { style: FIX_STYLE, legendLabel: 'Route fix' }
      }
      if (point.type === 'navaid') {
        return { style: NAVAID_STYLE, legendLabel: 'Route navaid' }
      }
      return { style: FALLBACK_STYLE, legendLabel: 'Other route point' }
  }
}

export const FLIGHT_ROUTE_LINE_STYLE = {
  color: '#b90078', width: 5, casingColor: '#ffffff', casingWidth: 9, arrows: true,
} as const
export const FLIGHT_AIRWAY_LINE_STYLE = {
  color: '#006d68', width: 7, casingColor: '#ffffff', casingWidth: 11, arrows: true,
} as const
export const FLIGHT_LEG_HIGHLIGHT_STYLE = {
  color: '#ffc247', width: 8, casingColor: '#342800', casingWidth: 12, arrows: true,
} as const
