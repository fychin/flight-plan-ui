# Flight Plan UI

A lightweight, single-page application for browsing flight plans from a backend API.

## Pages

| Page | Route | Description |
| --- | --- | --- |
| Flight Plans | `/` | Main page displaying a paginated table of flight plans. |
| Flight Plan Details | `/flight-plan/:id` | Detail view for an individual flight plan. |

## Configuration

The backend API base URL is set via the `VITE_API_BASE_URL` environment variable. For local development, create a `.env.local` file:

```
VITE_API_BASE_URL=http://localhost:3000
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
