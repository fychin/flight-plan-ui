import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapView.css'
import { getMapStyle } from './mapStyle'
import type { MapLine, MapMarker, MapViewProps } from './types'

type LineFeatureCollection = FeatureCollection<LineString, { id: string }>

const sourceIdForLine = (id: string) => `map-line-source-${encodeURIComponent(id)}`
const layerIdForLine = (id: string) => `map-line-layer-${encodeURIComponent(id)}`

const toLineFeatureCollection = (line: MapLine): LineFeatureCollection => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: line.id },
      geometry: {
        type: 'LineString',
        coordinates: line.coordinates.map(({ latitude, longitude }) => [longitude, latitude]),
      },
    },
  ],
})

const createPopupContent = (marker: MapMarker) => {
  const content = document.createElement('div')
  const title = document.createElement('strong')
  title.className = 'map-view__popup-title'
  title.textContent = marker.label
  content.append(title)

  for (const detail of marker.details ?? []) {
    const line = document.createElement('span')
    line.className = 'map-view__popup-detail'
    line.textContent = detail
    content.append(line)
  }

  return content
}

const createMarkerElement = (marker: MapMarker) => {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = `map-view__marker map-view__marker--hit-target map-view__marker--${marker.style.shape}${marker.flagged ? ' map-view__marker--flagged' : ''}`
  element.setAttribute('aria-label', marker.label)
  element.title = marker.label
  element.style.setProperty('--marker-color', marker.style.color)
  element.style.setProperty('--marker-size', `${marker.style.size ?? 24}px`)
  element.style.setProperty('--marker-fill', marker.style.fillColor ?? marker.style.color)
  if (marker.style.shape === 'diamond' || marker.style.shape === 'triangle') {
    // MapLibre owns the button's transform; rotate only its visual child.
    const shape = document.createElement('span')
    shape.className = `map-view__marker-${marker.style.shape}-shape`
    shape.setAttribute('aria-hidden', 'true')
    element.append(shape)
  }
  if (marker.style.badge) {
    const badge = document.createElement('span')
    badge.className = 'map-view__marker-badge'
    badge.textContent = marker.style.badge
    badge.setAttribute('aria-hidden', 'true')
    element.append(badge)
  }
  if (marker.showLabel) {
    const label = document.createElement('span')
    label.className = 'map-view__marker-label'
    label.textContent = marker.label
    label.setAttribute('aria-hidden', 'true')
    element.append(label)
  }
  return element
}

const reducedMotionRequested = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const EMPTY_LINES: MapLine[] = []
const ARROW_IMAGE = 'map-line-chevron'

const registerArrowImage = (map: maplibregl.Map) => {
  if (map.hasImage(ARROW_IMAGE)) return
  const canvas = document.createElement('canvas')
  canvas.width = 24
  canvas.height = 24
  const context = canvas.getContext('2d')
  if (!context) return
  context.strokeStyle = '#ffffff'
  context.lineWidth = 6
  context.lineJoin = 'round'
  context.beginPath()
  context.moveTo(8, 5)
  context.lineTo(16, 12)
  context.lineTo(8, 19)
  context.stroke()
  context.strokeStyle = '#273444'
  context.lineWidth = 2
  context.stroke()
  map.addImage(ARROW_IMAGE, context.getImageData(0, 0, 24, 24), { pixelRatio: 2 })
}

export const MapView = ({ markers, lines = EMPTY_LINES, focus, ariaLabel }: MapViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<maplibregl.Marker[]>([])
  const lineIdsRef = useRef<Set<string>>(new Set())
  const [readyMap, setReadyMap] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getMapStyle(),
      center: [0, 20],
      zoom: 1.5,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }))

    const onLoad = () => setReadyMap(map)
    map.on('load', onLoad)
    if (map.loaded()) setReadyMap(map)

    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => map.resize()) : null
    observer?.observe(containerRef.current)

    return () => {
      observer?.disconnect()
      map.off('load', onLoad)
      for (const marker of markerRefs.current) marker.remove()
      markerRefs.current = []
      lineIdsRef.current.clear()
      map.remove()
      if (mapRef.current === map) mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    // After initial readiness, pending tiles/source updates must not drop props.
    // Compare map instances so StrictMode cannot reuse a discarded map's readiness.
    if (!map || readyMap !== map) return

    for (const marker of markerRefs.current) marker.remove()
    markerRefs.current = markers.map((marker) => {
      const popup = new maplibregl.Popup({ offset: 14 }).setDOMContent(
        createPopupContent(marker),
      )
      const mapMarker = new maplibregl.Marker({
        element: createMarkerElement(marker),
        anchor: 'center',
      })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map)
      return mapMarker
    })
  }, [markers, readyMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || readyMap !== map) return
    const activeLineIds = new Set(
      lines.filter((line) => line.coordinates.length >= 2).map((line) => line.id),
    )

    for (const staleId of lineIdsRef.current) {
      if (activeLineIds.has(staleId)) continue
      const layerId = layerIdForLine(staleId)
      const sourceId = sourceIdForLine(staleId)
      for (const id of [`${layerId}-arrows`, layerId, `${layerId}-casing`]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }

    for (const line of lines) {
      if (line.coordinates.length < 2) continue
      const sourceId = sourceIdForLine(line.id)
      const layerId = layerIdForLine(line.id)
      const data = toLineFeatureCollection(line)
      const source = map.getSource(sourceId)

      if (source && 'setData' in source && typeof source.setData === 'function') {
        source.setData(data)
      } else if (!source) {
        map.addSource(sourceId, { type: 'geojson', data })
      }

      const casingId = `${layerId}-casing`
      if (line.style?.casingColor) {
        const casingPaint = {
          'line-color': line.style.casingColor,
          'line-width': line.style.casingWidth ?? (line.style.width ?? 3) + 4,
        }
        if (map.getLayer(casingId)) {
          map.setPaintProperty(casingId, 'line-color', casingPaint['line-color'])
          map.setPaintProperty(casingId, 'line-width', casingPaint['line-width'])
        } else {
          map.addLayer({ id: casingId, type: 'line', source: sourceId,
            layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: casingPaint,
          }, map.getLayer(layerId) ? layerId : undefined)
        }
      } else if (map.getLayer(casingId)) map.removeLayer(casingId)

      const paint = {
        'line-color': line.style?.color ?? '#00539c',
        'line-width': line.style?.width ?? 3,
        ...(line.style?.dasharray ? { 'line-dasharray': line.style.dasharray } : {}),
      }
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'line-color', paint['line-color'])
        map.setPaintProperty(layerId, 'line-width', paint['line-width'])
        map.setPaintProperty(layerId, 'line-dasharray', paint['line-dasharray'])
      } else {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint,
        })
      }
      const arrowsId = `${layerId}-arrows`
      if (line.style?.arrows) {
        registerArrowImage(map)
        if (map.hasImage(ARROW_IMAGE) && !map.getLayer(arrowsId)) {
          map.addLayer({ id: arrowsId, type: 'symbol', source: sourceId, layout: {
            'symbol-placement': 'line', 'symbol-spacing': 100,
            'icon-image': ARROW_IMAGE, 'icon-allow-overlap': true,
          } })
        }
      } else if (map.getLayer(arrowsId)) map.removeLayer(arrowsId)
    }
    lineIdsRef.current = activeLineIds
  }, [lines, readyMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || readyMap !== map) return
    const viewportMarkers = markers.filter((marker) => !marker.flagged)
    const fullRoute = viewportMarkers.length > 0 ? viewportMarkers : markers
    const focused = focus?.coordinates.length ? focus.coordinates : null
    const fitMarkers = focused
      ? [...new Map(focused.map((point) => [`${point.latitude}|${point.longitude}`, point])).values()]
      : fullRoute
    if (fitMarkers.length === 1) {
      const [marker] = fitMarkers
      if (marker) {
        map.easeTo({
          center: [marker.longitude, marker.latitude],
          zoom: 8,
          duration: reducedMotionRequested() ? 0 : 500,
        })
      }
    } else if (fitMarkers.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      for (const marker of fitMarkers) {
        bounds.extend([marker.longitude, marker.latitude])
      }
      map.fitBounds(bounds, {
        padding: focused ? 64 : 48,
        maxZoom: focused ? 11 : 9,
        duration: reducedMotionRequested() ? 0 : 500,
      })
    }
  }, [markers, focus, readyMap])

  return (
    <div className="map-view" role="region" aria-label={ariaLabel}>
      <div ref={containerRef} className="map-view__canvas" />
    </div>
  )
}
