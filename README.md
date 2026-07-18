# Bay Area Surf Almanac

Real-time surf conditions, tide charts, and personalized spot rankings for Bay Area breaks — powered by NOAA buoy & tide data.

The app pulls live buoy readings and tide predictions, scores each spot against your board and skill level, and ranks the coast so you know where to paddle out today, tomorrow, or later this week.

## Features

- **Ranked spots** — 10 Bay Area breaks scored on wave height, period, swell direction, wind, and tide, weighted for your board type and skill level.
- **Tufte-style tide charts** — a clean hourly tide curve with direct-labeled high/low points and a live "now" marker.
- **Multi-day forecast** — check current conditions or jump to a specific upcoming day.
- **Map & list views** — browse spots on a Mapbox map or as a ranked list, with drive times from your location.
- **Graceful degradation** — a tide-data outage never blanks the app; spots still rank on wave data with tides shown as unavailable.

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4** (Heritage design system — Fraunces / Public Sans / JetBrains Mono)
- **TanStack Query** for data fetching and caching
- **Mapbox GL** for the map view

## Data sources

| Data | Source |
| --- | --- |
| Wave & buoy readings | NOAA NDBC |
| Marine & weather forecast | Open-Meteo |
| Tide predictions | NOAA CO-OPS |
| Surf shape | Spitcast |
| Drive-time routing | OSRM |

## Getting started

```bash
npm install
npm run dev        # start the dev server (Vite)
```

Then open the printed local URL (default http://localhost:5173).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Spots covered

Half Moon Bay (Mavericks) · Pacifica (Linda Mar) · Ocean Beach SF · Fort Point · Bolinas · Stinson Beach · Rodeo Beach · Muir Beach · Dillon Beach · Salmon Creek
