export type MarkerShape = 'circle' | 'square' | 'diamond' | 'triangle' | 'pill'

export type MapMarker = {
  id: string
  latitude: number
  longitude: number
  label: string
  /** Extra popup lines, for example role and coordinates. */
  details?: string[]
  /** Visual style; shape and color together so meaning is not color-only. */
  style: { color: string; shape: MarkerShape; size?: number; badge?: string; fillColor?: string }
  showLabel?: boolean
  /** Dimmed/dashed marker left out of the initial viewport fit. */
  flagged?: boolean
}

export type MapLine = {
  id: string
  coordinates: { latitude: number; longitude: number }[]
  /** Optional name displayed along the line, for example an airway identifier. */
  label?: string
  /** Optional per-line styling. */
  style?: {
    color: string
    width?: number
    dasharray?: number[]
    casingColor?: string
    casingWidth?: number
    arrows?: boolean
  }
}

export type MapViewProps = {
  markers: MapMarker[]
  lines?: MapLine[]
  ariaLabel: string
  focus?: { key: string; coordinates: { latitude: number; longitude: number }[] } | null
}
