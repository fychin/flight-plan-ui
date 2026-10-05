# Flight Plan UI

A lightweight, single-page application for browsing flight plans from a backend API.

## Pages

| Page | Route | Description |
| --- | --- | --- |
| Flight Plans | `/` | Main page displaying a paginated table of flight plans. |
| Flight Plan Details | `/flight-plan/:id` | Flight details, an interactive route map, and a route summary. |

## Configuration

The backend API base URL is set via the `VITE_API_BASE_URL` environment variable. For local development, create a `.env.local` file:

```
VITE_API_BASE_URL=http://localhost:3000
```

## Route map

The details page lazy-loads MapLibre GL JS and uses OpenStreetMap raster tiles by default, with visible OpenStreetMap attribution. Markers show airports, alternates, route points, and airway waypoints; selecting a marker opens its role, type, and coordinates. A legend and route summary appear below the map. Plans without plottable coordinates show an empty state.

To use another tile provider, set the optional **VITE_MAP_STYLE_URL** environment variable to a MapLibre style JSON URL. Keep any provider API key in local, untracked environment files such as [`.env.local`](.env.local), never in source control. Vite embeds client-side configuration in the browser bundle, so this is not suitable for private server credentials; use a provider-approved public token with appropriate restrictions.

The [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) applies to the default tiles. The public tile server is for light use; production deployments should use their own or a commercial tile provider. Preserve the provider's required attribution.

Route and airway points farther than **OUTLIER_DISTANCE_NM (1500 NM)** from the departure–destination corridor are still plotted but flagged. They are excluded from the general route line and initial viewport fit, while the airway overlay retains them. If every plotted point is flagged, the map fits all points as a fallback. Points with missing or invalid coordinates are reported as not plotted. Summary distances are great-circle estimates along the plotted route, not flown distances.

The API contract follows the backend's OpenAPI specification served at **/openapi.json**; see the [flight plan types](src/types/flightPlan.ts) and [API client](src/api/flightPlan.ts).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
