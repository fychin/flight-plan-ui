import type { StyleSpecification } from 'maplibre-gl'

export const DEFAULT_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'openstreetmap-raster',
      type: 'raster',
      source: 'openstreetmap',
    },
  ],
}

export const getMapStyle = (): string | StyleSpecification => {
  const configuredStyleUrl = import.meta.env.VITE_MAP_STYLE_URL
  return typeof configuredStyleUrl === 'string' && configuredStyleUrl.trim()
    ? configuredStyleUrl
    : DEFAULT_MAP_STYLE
}
