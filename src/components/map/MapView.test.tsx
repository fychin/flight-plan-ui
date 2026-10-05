import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapLine, MapMarker } from './types'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

const mocks = vi.hoisted(() => {
  const state = {
    setWorkerUrl: vi.fn(),
    mapConstructed: vi.fn(),
    initiallyLoaded: true,
    maps: [] as Array<{
      on: ReturnType<typeof vi.fn>
      off: ReturnType<typeof vi.fn>
      loaded: ReturnType<typeof vi.fn>
      addControl: ReturnType<typeof vi.fn>
      addSource: ReturnType<typeof vi.fn>
      addLayer: ReturnType<typeof vi.fn>
      addImage: ReturnType<typeof vi.fn>
      hasImage: ReturnType<typeof vi.fn>
      getSource: ReturnType<typeof vi.fn>
      getLayer: ReturnType<typeof vi.fn>
      removeSource: ReturnType<typeof vi.fn>
      removeLayer: ReturnType<typeof vi.fn>
      setPaintProperty: ReturnType<typeof vi.fn>
      fitBounds: ReturnType<typeof vi.fn>
      easeTo: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
      sources: Map<string, { setData: ReturnType<typeof vi.fn> }>
      layers: Set<string>
    }>,
    markers: [] as Array<{
      remove: ReturnType<typeof vi.fn>
      setLngLat: ReturnType<typeof vi.fn>
      setPopup: ReturnType<typeof vi.fn>
      addTo: ReturnType<typeof vi.fn>
      element: HTMLElement
    }>,
    popups: [] as Array<{ setDOMContent: ReturnType<typeof vi.fn>; content?: Node }>,
    controls: [] as Array<{ options: { showCompass: boolean } }>,
    bounds: [] as Array<{ extend: ReturnType<typeof vi.fn> }>,
  }
  return state
})

vi.mock('maplibre-gl', () => {
  class MapMock {
    on = vi.fn()
    off = vi.fn()
    loaded = vi.fn(() => mocks.initiallyLoaded)
    addControl = vi.fn()
    addSource = vi.fn((id: string, source: unknown) => {
      void source
      this.sources.set(id, { setData: vi.fn() })
    })
    addLayer = vi.fn((layer: { id: string }) => this.layers.add(layer.id))
    getSource = vi.fn((id: string) => this.sources.get(id))
    getLayer = vi.fn((id: string) => this.layers.has(id) ? { id } : undefined)
    removeSource = vi.fn((id: string) => this.sources.delete(id))
    removeLayer = vi.fn((id: string) => this.layers.delete(id))
    images = new Set<string>()
    addImage = vi.fn((id: string) => this.images.add(id))
    hasImage = vi.fn((id: string) => this.images.has(id))
    setPaintProperty = vi.fn()
    fitBounds = vi.fn()
    easeTo = vi.fn()
    remove = vi.fn()
    sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>()
    layers = new Set<string>()

    constructor(options: unknown) {
      mocks.mapConstructed(options)
      mocks.maps.push(this)
    }
  }

  class MarkerMock {
    remove = vi.fn()
    setLngLat = vi.fn(() => this)
    setPopup = vi.fn(() => this)
    addTo = vi.fn(() => this)
    element: HTMLElement

    constructor(options: { element: HTMLElement }) {
      this.element = options.element
      mocks.markers.push(this)
    }
  }

  class PopupMock {
    setDOMContent = vi.fn((content: Node) => {
      mocks.popups.push({ setDOMContent: this.setDOMContent, content })
      return this
    })

    constructor(options: unknown) {
      void options
    }
  }

  class NavigationControlMock {
    options: { showCompass: boolean }

    constructor(options: unknown) {
      this.options = options as { showCompass: boolean }
      mocks.controls.push(this)
    }
  }

  class LngLatBoundsMock {
    extend = vi.fn((coordinates: [number, number]) => {
      this.coordinates.push(coordinates)
      return this
    })
    coordinates: Array<[number, number]> = []

    constructor() {
      mocks.bounds.push(this)
    }
  }

  return {
    setWorkerUrl: mocks.setWorkerUrl,
    Map: MapMock,
    Marker: MarkerMock,
    Popup: PopupMock,
    NavigationControl: NavigationControlMock,
    LngLatBounds: LngLatBoundsMock,
  }
})

import { MapView } from './MapView'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
beforeEach(() => {
  mocks.setWorkerUrl.mockClear()
  mocks.mapConstructed.mockClear()
  mocks.initiallyLoaded = true
  mocks.maps.length = 0
  mocks.markers.length = 0
  mocks.popups.length = 0
  mocks.controls.length = 0
  mocks.bounds.length = 0
})

const marker = (id: string, flagged = false): MapMarker => ({
  id,
  latitude: id === 'A' ? 1 : 2,
  longitude: id === 'A' ? 3 : 4,
  label: id,
  details: ['Route point'],
  style: { color: '#00539c', shape: 'circle' },
  flagged,
})

const triggerLoad = () => {
  const map = mocks.maps[0]
  const loadHandler = map?.on.mock.calls.find(([event]) => event === 'load')?.[1]
  if (typeof loadHandler === 'function') act(() => loadHandler())
}

describe('MapView', () => {
  it('creates one map and adds navigation controls', () => {
    render(<MapView markers={[]} ariaLabel="Route map" />)

    expect(mocks.maps).toHaveLength(1)
    expect(mocks.maps[0]?.addControl).toHaveBeenCalledOnce()
    expect(mocks.controls[0]?.options).toEqual({ showCompass: false })
    expect(screen.getByRole('region', { name: 'Route map' })).toBeTruthy()
  })

  it('configures the Vite-bundled worker before constructing the map', () => {
    render(<MapView markers={[]} ariaLabel="Route map" />)

    expect(mocks.setWorkerUrl).toHaveBeenCalledWith(mapWorkerUrl)
    expect(mocks.setWorkerUrl.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.mapConstructed.mock.invocationCallOrder[0],
    )
  })

  it('adds an accessible marker and creates popup content without interpreting HTML', async () => {
    const unsafeLabel = '<img src=x onerror=alert(1)>'
    render(<MapView markers={[{ ...marker('A'), label: unsafeLabel }]} ariaLabel="Route map" />)
    triggerLoad()

    await waitFor(() => expect(mocks.markers).toHaveLength(1))
    expect(mocks.markers[0]?.element.getAttribute('aria-label')).toBe(unsafeLabel)
    const popupContent = mocks.popups[0]?.content as HTMLElement | undefined
    expect(popupContent?.textContent).toContain(unsafeLabel)
    expect(popupContent?.querySelector('img')).toBeNull()
  })

  it('updates markers without creating another map', async () => {
    const view = render(<MapView markers={[marker('A')]} ariaLabel="Route map" />)
    triggerLoad()
    await waitFor(() => expect(mocks.markers).toHaveLength(1))

    view.rerender(<MapView markers={[marker('B')]} ariaLabel="Route map" />)
    await waitFor(() => expect(mocks.markers).toHaveLength(2))
    expect(mocks.maps).toHaveLength(1)
    expect(mocks.markers[0]?.remove).toHaveBeenCalledOnce()
    expect(mocks.markers[1]?.element.getAttribute('aria-label')).toBe('B')
  })

  it('waits for initial load and applies the latest marker props', async () => {
    mocks.initiallyLoaded = false
    const view = render(<MapView markers={[marker('A')]} ariaLabel="Route map" />)
    view.rerender(<MapView markers={[marker('B')]} ariaLabel="Route map" />)

    expect(mocks.markers).toHaveLength(0)
    expect(mocks.maps[0]?.easeTo).not.toHaveBeenCalled()
    triggerLoad()

    await waitFor(() => expect(mocks.markers).toHaveLength(1))
    expect(mocks.markers[0]?.element.getAttribute('aria-label')).toBe('B')
  })

  it('applies marker and line updates while tiles or sources are still loading', async () => {
    const line: MapLine = {
      id: 'route',
      coordinates: [
        { latitude: 10, longitude: 20 },
        { latitude: 11, longitude: 21 },
      ],
    }
    const view = render(<MapView markers={[marker('A')]} lines={[line]} ariaLabel="Route map" />)
    await waitFor(() => expect(mocks.maps[0]?.addLayer).toHaveBeenCalledOnce())
    const map = mocks.maps[0]
    const source = map?.sources.get('map-line-source-route')
    map?.loaded.mockReturnValue(false)
    const updatedLine: MapLine = { ...line, coordinates: [...line.coordinates].reverse() }

    view.rerender(<MapView markers={[marker('B')]} lines={[updatedLine]} ariaLabel="Route map" />)

    await waitFor(() => expect(source?.setData).toHaveBeenCalledOnce())
    expect(source?.setData.mock.calls[0]?.[0]).toMatchObject({
      features: [{ geometry: { coordinates: [[21, 11], [20, 10]] } }],
    })
    expect(mocks.markers[0]?.remove).toHaveBeenCalledOnce()
    expect(mocks.markers[1]?.element.getAttribute('aria-label')).toBe('B')
    expect(map?.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ center: [4, 2] }))

    view.rerender(<MapView markers={[]} lines={[]} ariaLabel="Route map" />)
    expect(map?.removeLayer).toHaveBeenCalledWith('map-line-layer-route')
    expect(map?.removeSource).toHaveBeenCalledWith('map-line-source-route')
  })

  it('keeps the diamond visual separate from the element positioned by MapLibre', async () => {
    render(<MapView markers={[{
      ...marker('A'),
      style: { color: '#6840a0', shape: 'diamond' },
    }]} ariaLabel="Route map" />)
    await waitFor(() => expect(mocks.markers).toHaveLength(1))
    const element = mocks.markers[0]?.element
    // Simulate MapLibre overwriting the outer element's positioning transform.
    if (element) element.style.transform = 'translate(100px, 100px)'
    const shape = element?.querySelector('.map-view__marker-diamond-shape')

    expect(element?.tagName).toBe('BUTTON')
    expect(element?.getAttribute('aria-label')).toBe('A')
    expect(shape).toBeTruthy()
    expect(shape?.getAttribute('aria-hidden')).toBe('true')
    expect(element?.style.getPropertyValue('--marker-color')).toBe('#6840a0')
  })

  it('fits non-flagged markers and falls back to flagged markers when all are flagged', async () => {
    const view = render(
      <MapView
        markers={[marker('A'), marker('C'), marker('B', true)]}
        ariaLabel="Route map"
      />,
    )
    triggerLoad()
    await waitFor(() => expect(mocks.maps[0]?.fitBounds).toHaveBeenCalledOnce())
    expect(mocks.bounds[0]?.extend).toHaveBeenCalledWith([3, 1])
    expect(mocks.bounds[0]?.extend).toHaveBeenCalledWith([4, 2])
    expect(mocks.bounds[0]?.extend).toHaveBeenCalledTimes(2)

    view.rerender(<MapView markers={[marker('B', true)]} ariaLabel="Route map" />)
    await waitFor(() => expect(mocks.maps[0]?.easeTo).toHaveBeenCalledOnce())
    expect(mocks.maps[0]?.easeTo.mock.calls[0]?.[0]).toMatchObject({ center: [4, 2] })
  })

  it('does not fit bounds when there are no markers', () => {
    render(<MapView markers={[]} ariaLabel="Route map" />)

    expect(mocks.maps[0]?.fitBounds).not.toHaveBeenCalled()
    expect(mocks.maps[0]?.easeTo).not.toHaveBeenCalled()
  })

  it('uses an immediate single-marker viewport change when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    render(<MapView markers={[marker('A')]} ariaLabel="Route map" />)
    triggerLoad()

    await waitFor(() => expect(mocks.maps[0]?.easeTo).toHaveBeenCalledOnce())
    expect(mocks.maps[0]?.easeTo.mock.calls[0]?.[0]).toMatchObject({ duration: 0 })
  })

  it('sets per-line GeoJSON coordinates as longitude, latitude and skips short lines', async () => {
    const lines: MapLine[] = [
      {
        id: 'route',
        coordinates: [
          { latitude: 10, longitude: 20 },
          { latitude: 11, longitude: 21 },
        ],
        style: { color: '#008080', width: 5, dasharray: [2, 1] },
      },
      { id: 'short', coordinates: [{ latitude: 0, longitude: 0 }] },
    ]
    render(<MapView markers={[]} lines={lines} ariaLabel="Route map" />)
    triggerLoad()

    await waitFor(() => expect(mocks.maps[0]?.addLayer).toHaveBeenCalledOnce())
    const map = mocks.maps[0]
    const sourceId = 'map-line-source-route'
    const sourceOptions = map?.addSource.mock.calls[0]?.[1] as {
      data: { features: Array<{ geometry: { coordinates: number[][] } }> }
    }
    expect(sourceOptions.data.features[0]?.geometry.coordinates).toEqual([
      [20, 10],
      [21, 11],
    ])
    expect(map?.addLayer.mock.calls[0]?.[0]).toMatchObject({
      paint: { 'line-color': '#008080', 'line-width': 5, 'line-dasharray': [2, 1] },
    })
    expect(map?.addSource).toHaveBeenCalledTimes(1)
    expect(map?.sources.has(sourceId)).toBe(true)
  })

  it('updates line data and styles, clears stale dash styles, and removes obsolete lines', async () => {
    const initialLine: MapLine = {
      id: 'route',
      coordinates: [
        { latitude: 10, longitude: 20 },
        { latitude: 11, longitude: 21 },
      ],
      style: { color: '#008080', width: 5, dasharray: [2, 1] },
    }
    const view = render(<MapView markers={[]} lines={[initialLine]} ariaLabel="Route map" />)
    triggerLoad()

    await waitFor(() => expect(mocks.maps[0]?.addLayer).toHaveBeenCalledOnce())
    const map = mocks.maps[0]
    const source = map?.sources.get('map-line-source-route')
    const updatedLine: MapLine = {
      ...initialLine,
      coordinates: [
        { latitude: 12, longitude: 22 },
        { latitude: 13, longitude: 23 },
      ],
      style: { color: '#123456', width: 4 },
    }

    view.rerender(<MapView markers={[]} lines={[updatedLine]} ariaLabel="Route map" />)

    await waitFor(() => expect(source?.setData).toHaveBeenCalledOnce())
    expect(source?.setData.mock.calls[0]?.[0]).toMatchObject({
      features: [{ geometry: { coordinates: [[22, 12], [23, 13]] } }],
    })
    expect(map?.setPaintProperty).toHaveBeenCalledWith(
      'map-line-layer-route',
      'line-dasharray',
      undefined,
    )

    view.rerender(<MapView markers={[]} lines={[]} ariaLabel="Route map" />)

    expect(map?.removeLayer).toHaveBeenCalledWith('map-line-layer-route')
    expect(map?.removeSource).toHaveBeenCalledWith('map-line-source-route')
  })

  it('labels every fix-to-fix segment with larger text without labeling unnamed lines', () => {
    const coordinates = [{ latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 }]
    const lines: MapLine[] = [
      { id: 'route', coordinates },
      { id: 'airway-main', coordinates: [...coordinates, { latitude: 5, longitude: 6 }], label: 'G579', style: { color: '#006d68', width: 7 } },
      { id: 'airway-branch', coordinates: [coordinates[1], { latitude: 5, longitude: 6 }], label: 'G579' },
    ]
    render(<MapView markers={[]} lines={lines} ariaLabel="Route map" />)
    const map = mocks.maps[0]

    expect(map.addSource).toHaveBeenCalledWith('map-line-source-airway-main', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [{
        type: 'Feature', properties: { id: 'airway-main', label: 'G579' },
        geometry: { type: 'LineString', coordinates: [[2, 1], [4, 3], [6, 5]] },
      }] },
    })
    expect(map.addSource).toHaveBeenCalledWith('map-line-source-airway-branch', expect.objectContaining({
      data: expect.objectContaining({ features: [expect.objectContaining({
        properties: { id: 'airway-branch', label: 'G579' },
        geometry: { type: 'LineString', coordinates: [[4, 3], [6, 5]] },
      })] }),
    }))
    expect(map.addLayer).toHaveBeenCalledWith({
      id: 'map-line-layer-airway-main-label', type: 'symbol', source: 'map-line-source-airway-main-labels',
      layout: {
        'symbol-placement': 'point',
        'text-field': ['get', 'label'], 'text-font': ['Open Sans Bold'],
        'text-size': 18, 'text-offset': [0, -0.8],
        'text-allow-overlap': true, 'text-ignore-placement': true,
      },
      paint: { 'text-color': '#006d68', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
    })
    expect(map.addSource).toHaveBeenCalledWith('map-line-source-airway-main-labels', {
      type: 'geojson', data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { label: 'G579' }, geometry: { type: 'Point', coordinates: [3, 2] } },
        { type: 'Feature', properties: { label: 'G579' }, geometry: { type: 'Point', coordinates: [5, 4] } },
      ] },
    })
    expect(map.layers.has('map-line-layer-airway-branch-label')).toBe(true)
    expect(map.layers.has('map-line-layer-route-label')).toBe(false)
    expect(map.addSource).toHaveBeenCalledTimes(5)
  })

  it('updates, toggles, and removes segment labels and their source', () => {
    const line: MapLine = { id: 'airway', label: 'G579', coordinates: [
      { latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 },
    ], style: { color: '#273444' } }
    const view = render(<MapView markers={[]} lines={[line]} ariaLabel="Route map" />)
    const map = mocks.maps[0]
    const source = map.sources.get('map-line-source-airway')
    const labelSource = map.sources.get('map-line-source-airway-labels')

    view.rerender(<MapView markers={[]} lines={[{
      ...line, label: 'A1', coordinates: [line.coordinates[0], { latitude: 5, longitude: 6 }], style: { color: '#006d68' },
    }]} ariaLabel="Route map" />)
    expect(source?.setData).toHaveBeenLastCalledWith(expect.objectContaining({
      features: [expect.objectContaining({ properties: { id: 'airway', label: 'A1' } })],
    }))
    expect(labelSource?.setData).toHaveBeenLastCalledWith({
      type: 'FeatureCollection', features: [{
        type: 'Feature', properties: { label: 'A1' }, geometry: { type: 'Point', coordinates: [4, 3] },
      }],
    })
    expect(map.setPaintProperty).toHaveBeenCalledWith('map-line-layer-airway-label', 'text-color', '#006d68')
    expect(map.addLayer).toHaveBeenCalledTimes(2)

    view.rerender(<MapView markers={[]} lines={[{ ...line, label: undefined }]} ariaLabel="Route map" />)
    expect(map.removeLayer).toHaveBeenCalledWith('map-line-layer-airway-label')
    expect(map.removeSource).toHaveBeenCalledWith('map-line-source-airway-labels')
    expect(map.layers.has('map-line-layer-airway')).toBe(true)
    expect(map.sources.has('map-line-source-airway')).toBe(true)

    view.rerender(<MapView markers={[]} lines={[line]} ariaLabel="Route map" />)
    expect(map.layers.has('map-line-layer-airway-label')).toBe(true)
    map.removeLayer.mockClear()
    map.removeSource.mockClear()
    view.rerender(<MapView markers={[]} lines={[{ ...line, coordinates: [line.coordinates[0]] }]} ariaLabel="Route map" />)
    expect(map.removeLayer.mock.calls.map(([id]) => id)).toEqual([
      'map-line-layer-airway-label', 'map-line-layer-airway',
    ])
    expect(map.removeSource).toHaveBeenCalledWith('map-line-source-airway')
    expect(map.removeSource).toHaveBeenCalledWith('map-line-source-airway-labels')
    expect(map.removeLayer.mock.invocationCallOrder.at(-1)).toBeLessThan(map.removeSource.mock.invocationCallOrder[0])
  })

  it('skips duplicate segment labels and centers dateline-crossing labels near the dateline', () => {
    render(<MapView markers={[]} lines={[{ id: 'dateline', label: 'A1', coordinates: [
      { latitude: 10, longitude: 179 }, { latitude: 10, longitude: 179 },
      { latitude: 12, longitude: -179 },
    ] }]} ariaLabel="Route map" />)
    expect(mocks.maps[0].addSource).toHaveBeenCalledWith('map-line-source-dateline-labels', {
      type: 'geojson', data: { type: 'FeatureCollection', features: [{
        type: 'Feature', properties: { label: 'A1' }, geometry: { type: 'Point', coordinates: [-180, 11] },
      }] },
    })
  })

  it('renders badge, persistent label, custom size, and minimum hit target without changing positioning', () => {
    render(<MapView markers={[{
      ...marker('A'), showLabel: true,
      style: { color: '#176b3a', shape: 'pill', badge: 'DEP', size: 30 },
    }]} ariaLabel="Route map" />)
    const element = mocks.markers[0].element
    expect(element.querySelector('.map-view__marker-badge')?.textContent).toBe('DEP')
    expect(element.querySelector('.map-view__marker-label')?.textContent).toBe('A')
    expect(element.style.getPropertyValue('--marker-size')).toBe('30px')
    expect(element.classList.contains('map-view__marker--hit-target')).toBe(true)
    expect(element.style.transform).toBe('')
  })

  it('adds, updates, and removes casing and arrow layers with their shared source', () => {
    const context = {
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      getImageData: vi.fn(() => ({ width: 24, height: 24, data: new Uint8ClampedArray(24 * 24 * 4) })),
    }
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context as unknown as CanvasRenderingContext2D)
    const line: MapLine = { id: 'cased', coordinates: [
      { latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 },
    ], style: { color: '#b90078', width: 5, casingColor: '#ffffff', casingWidth: 9, arrows: true } }
    const markers: MapMarker[] = []
    const view = render(<MapView markers={markers} lines={[line]} ariaLabel="Route map" />)
    const map = mocks.maps[0]
    expect(map.addImage).toHaveBeenCalledOnce()
    expect(map.addLayer.mock.calls.map(([layer]) => layer.id)).toEqual([
      'map-line-layer-cased-casing', 'map-line-layer-cased', 'map-line-layer-cased-arrows',
    ])
    expect(map.addLayer.mock.calls[2][0]).toMatchObject({
      type: 'symbol', source: 'map-line-source-cased',
      layout: { 'symbol-placement': 'line', 'icon-image': 'map-line-chevron' },
    })
    view.rerender(<MapView markers={markers} lines={[{ ...line, style: { ...line.style!, casingColor: '#000000', casingWidth: 12 } }]} ariaLabel="Route map" />)
    expect(map.setPaintProperty).toHaveBeenCalledWith('map-line-layer-cased-casing', 'line-color', '#000000')
    expect(map.setPaintProperty).toHaveBeenCalledWith('map-line-layer-cased-casing', 'line-width', 12)
    expect(map.addImage).toHaveBeenCalledOnce()
    view.rerender(<MapView markers={markers} lines={[]} ariaLabel="Route map" />)
    expect(map.removeLayer.mock.calls.map(([id]) => id)).toEqual([
      'map-line-layer-cased-arrows', 'map-line-layer-cased', 'map-line-layer-cased-casing',
    ])
    expect(map.removeSource).toHaveBeenCalledWith('map-line-source-cased')
    canvas.mockRestore()
  })

  it('can enable and disable casing and arrows on an existing line', () => {
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
      beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      getImageData: vi.fn(() => ({ width: 24, height: 24, data: new Uint8ClampedArray(24 * 24 * 4) })),
    }) as unknown as CanvasRenderingContext2D)
    const markers: MapMarker[] = []
    const line: MapLine = { id: 'route', coordinates: [
      { latitude: 1, longitude: 2 }, { latitude: 3, longitude: 4 },
    ] }
    const view = render(<MapView markers={markers} lines={[line]} ariaLabel="Route map" />)
    view.rerender(<MapView markers={markers} lines={[{ ...line, style: { color: '#b90078', casingColor: '#fff', arrows: true } }]} ariaLabel="Route map" />)
    const map = mocks.maps[0]
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'map-line-layer-route-casing' }), 'map-line-layer-route')
    view.rerender(<MapView markers={markers} lines={[line]} ariaLabel="Route map" />)
    expect(map.removeLayer).toHaveBeenCalledWith('map-line-layer-route-casing')
    expect(map.removeLayer).toHaveBeenCalledWith('map-line-layer-route-arrows')
    expect(map.sources.has('map-line-source-route')).toBe(true)
    canvas.mockRestore()
  })

  it('focuses coordinates without recreating markers, clears focus, and ignores line-only viewport changes', () => {
    const markers = [marker('A'), marker('B')]
    const view = render(<MapView markers={markers} ariaLabel="Route map" />)
    const map = mocks.maps[0]
    const coordinates = [{ latitude: 10, longitude: 20 }, { latitude: 11, longitude: 21 }]
    view.rerender(<MapView markers={markers} focus={{ key: 'leg-1', coordinates }} ariaLabel="Route map" />)
    expect(mocks.markers).toHaveLength(2)
    expect(mocks.markers[0].remove).not.toHaveBeenCalled()
    expect(mocks.bounds.at(-1)?.extend.mock.calls).toEqual([[[20, 10]], [[21, 11]]])
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.anything(), { padding: 64, maxZoom: 11, duration: 500 })
    view.rerender(<MapView markers={markers} focus={null} ariaLabel="Route map" />)
    expect(map.fitBounds).toHaveBeenLastCalledWith(expect.anything(), { padding: 48, maxZoom: 9, duration: 500 })
    expect(mocks.bounds.at(-1)?.extend.mock.calls).toEqual([[[3, 1]], [[4, 2]]])
    const fitCount = map.fitBounds.mock.calls.length
    view.rerender(<MapView markers={markers} focus={null} lines={[{ id: 'route', coordinates }]} ariaLabel="Route map" />)
    expect(map.fitBounds).toHaveBeenCalledTimes(fitCount)
    expect(mocks.markers).toHaveLength(2)
  })

  it('uses easeTo for one distinct focus point and honors reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    render(<MapView markers={[]} focus={{ key: 'one', coordinates: [
      { latitude: 10, longitude: 20 }, { latitude: 10, longitude: 20 },
    ] }} ariaLabel="Route map" />)
    expect(mocks.maps[0].easeTo).toHaveBeenCalledWith({ center: [20, 10], zoom: 8, duration: 0 })
    expect(mocks.maps[0].fitBounds).not.toHaveBeenCalled()
  })

  it('cleans up the discarded map and the active map under StrictMode', async () => {
    const view = render(
      <StrictMode>
        <MapView markers={[marker('A')]} ariaLabel="Route map" />
      </StrictMode>,
    )

    expect(mocks.maps).toHaveLength(2)
    expect(mocks.maps[0]?.remove).toHaveBeenCalledOnce()
    await waitFor(() => expect(mocks.markers).toHaveLength(1))

    view.unmount()

    expect(mocks.maps[1]?.remove).toHaveBeenCalledOnce()
    expect(mocks.markers[0]?.remove).toHaveBeenCalledOnce()
  })

  it('removes markers and map on unmount', async () => {
    const view = render(<MapView markers={[marker('A')]} ariaLabel="Route map" />)
    triggerLoad()
    await waitFor(() => expect(mocks.markers).toHaveLength(1))

    view.unmount()
    expect(mocks.markers[0]?.remove).toHaveBeenCalledOnce()
    expect(mocks.maps[0]?.remove).toHaveBeenCalledOnce()
  })
})
