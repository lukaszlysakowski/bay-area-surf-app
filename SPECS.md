# Bay Area Surf Almanac - Complete Technical Specification

## Overview
A personalized surf forecasting app for Bay Area surfers, providing real-time conditions, tide charts, and ranked spot recommendations based on user preferences.

**Original Stack (Lovable):** React + Vite + Tailwind CSS + Supabase Edge Functions

---

## Architecture

### Frontend
- **Framework:** React (Vite build)
- **Styling:** Tailwind CSS
- **Fonts:** 
  - Inter (weights: 300-700)
  - Outfit (weights: 300-800)
- **Maps:** Mapbox GL JS (for map view)
- **Charts:** Custom SVG-based tide/wave charts

### Backend/APIs
1. **Supabase Edge Function:** `https://ouuyaagyxliatwuqzxep.supabase.co/functions/v1/fetch-surf-data`
   - Proxies NOAA/tide API calls server-side
   - Returns aggregated surf data for all spots

2. **OSRM Routing API:** `https://router.project-osrm.org/route/v1/driving/`
   - Calculates driving times from user's start address to each surf spot

3. **NOAA APIs** (detailed below)

4. **Mapbox GL JS** (detailed below)

---

## NOAA API Integration - Complete Details

### 1. NDBC (National Data Buoy Center) - Wave/Buoy Data

**Base URL:** `https://www.ndbc.noaa.gov/data/realtime2/`

**Bay Area Buoy Stations:**

| Station ID | Name | Location | Coordinates | Best For |
|------------|------|----------|-------------|----------|
| 46012 | Half Moon Bay | 24NM SSW of San Francisco | 37.356°N, 122.881°W | Mavericks, HMB |
| 46026 | San Francisco | 18NM West of SF | 37.750°N, 122.838°W | Ocean Beach, Fort Point |
| 46237 | SF Bar | Near Golden Gate | 37.788°N, 122.634°W | Inner bay spots |
| 46214 | Point Reyes | 19NM WSW of Pt Reyes | 37.946°N, 123.469°W | Bolinas, Stinson |
| 46013 | Bodega Bay | 48NM NNW of SF | 38.253°N, 123.303°W | Sonoma Coast |

**Realtime Data Endpoints:**

```
# Standard meteorological data (wind, pressure, air temp)
https://www.ndbc.noaa.gov/data/realtime2/{STATION_ID}.txt

# Spectral wave summary (wave height, period, direction)
https://www.ndbc.noaa.gov/data/realtime2/{STATION_ID}.spec

# Detailed spectral wave data
https://www.ndbc.noaa.gov/data/realtime2/{STATION_ID}.data_spec

# Continuous wind data
https://www.ndbc.noaa.gov/data/realtime2/{STATION_ID}.cwind
```

**Example - Fetch Station 46026 Data:**
```
GET https://www.ndbc.noaa.gov/data/realtime2/46026.txt
```

**Response Format (space-delimited text):**
```
#YY  MM DD hh mm WDIR WSPD GST  WVHT   DPD   APD MWD   PRES  ATMP  WTMP  DEWP  VIS PTDY  TIDE
#yr  mo dy hr mn degT m/s  m/s     m   sec   sec degT   hPa  degC  degC  degC  nmi  hPa    ft
2026 01 28 20 50 310  5.0  6.0   1.8   8.0   5.5  280 1015.2  12.0  11.5  10.0   MM  0.0    MM
```

**Key Fields:**
- `WVHT` - Significant wave height (meters) - average of highest 1/3 of waves
- `DPD` - Dominant wave period (seconds)
- `APD` - Average wave period (seconds)
- `MWD` - Mean wave direction (degrees from true North)
- `WSPD` - Wind speed (m/s)
- `WDIR` - Wind direction (degrees from true North)
- `WTMP` - Water temperature (Celsius)
- `ATMP` - Air temperature (Celsius)

**Parsing Code Example:**
```typescript
interface BuoyData {
  timestamp: Date;
  waveHeight: number;      // feet (convert from meters)
  wavePeriod: number;      // seconds
  waveDirection: number;   // degrees
  windSpeed: number;       // mph (convert from m/s)
  windDirection: number;   // degrees
  waterTemp: number;       // °F (convert from °C)
  airTemp: number;         // °F (convert from °C)
}

async function fetchBuoyData(stationId: string): Promise<BuoyData[]> {
  const response = await fetch(
    `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`
  );
  const text = await response.text();
  const lines = text.split('\n').filter(line => !line.startsWith('#'));
  
  return lines.map(line => {
    const parts = line.trim().split(/\s+/);
    return {
      timestamp: new Date(`${parts[0]}-${parts[1]}-${parts[2]}T${parts[3]}:${parts[4]}:00Z`),
      waveHeight: parseFloat(parts[8]) * 3.28084,  // m to ft
      wavePeriod: parseFloat(parts[9]),
      waveDirection: parseInt(parts[11]),
      windSpeed: parseFloat(parts[6]) * 2.237,     // m/s to mph
      windDirection: parseInt(parts[5]),
      waterTemp: parseFloat(parts[14]) * 9/5 + 32, // C to F
      airTemp: parseFloat(parts[13]) * 9/5 + 32,
    };
  });
}
```

---

### 2. NOAA CO-OPS API - Tide Predictions

**Base URL:** `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter`

**Bay Area Tide Stations:**

| Station ID | Name | Location |
|------------|------|----------|
| 9414290 | San Francisco | Fort Point, Golden Gate |
| 9414523 | Redwood City | South Bay |
| 9414750 | Alameda | East Bay |
| 9414863 | Richmond | North Bay |
| 9415020 | Point Reyes | Marin County |
| 9413450 | Monterey | South of HMB |

**Tide Predictions Endpoint:**

```
GET https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?
  station=9414290
  &product=predictions
  &datum=MLLW
  &time_zone=lst_ldt
  &units=english
  &interval=hilo
  &format=json
  &begin_date=20260128
  &end_date=20260128
  &application=BayAreaSurfAlmanac
```

**Parameters:**
- `station` - 7-character station ID
- `product` - `predictions` for tide predictions, `water_level` for real-time
- `datum` - Reference datum (`MLLW` = Mean Lower Low Water, most common)
- `time_zone` - `lst_ldt` (local with daylight saving), `gmt`, or `lst`
- `units` - `english` (feet) or `metric` (meters)
- `interval` - `hilo` (high/low only), `h` (hourly), `6` (6-minute)
- `format` - `json`, `xml`, or `csv`
- `begin_date` / `end_date` - Format: `YYYYMMDD`
- `application` - Your app name (required, for tracking)

**High/Low Tide Response (interval=hilo):**
```json
{
  "predictions": [
    {
      "t": "2026-01-28 08:11",
      "v": "5.892",
      "type": "H"
    },
    {
      "t": "2026-01-28 14:02",
      "v": "0.623",
      "type": "L"
    },
    {
      "t": "2026-01-28 20:19",
      "v": "5.341",
      "type": "H"
    },
    {
      "t": "2026-01-29 01:33",
      "v": "1.012",
      "type": "L"
    }
  ]
}
```

**Hourly Tide Response (interval=h):**
```json
{
  "predictions": [
    { "t": "2026-01-28 00:00", "v": "3.214" },
    { "t": "2026-01-28 01:00", "v": "2.891" },
    { "t": "2026-01-28 02:00", "v": "2.456" },
    // ... continues hourly
  ]
}
```

**TypeScript Interface & Fetch:**
```typescript
interface TidePrediction {
  time: string;
  height: number;
  type: 'H' | 'L' | null;  // High, Low, or null for hourly
}

interface TideData {
  highLow: TidePrediction[];
  hourly: TidePrediction[];
}

async function fetchTideData(
  stationId: string,
  date: string  // YYYYMMDD format
): Promise<TideData> {
  const baseUrl = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  
  // Fetch high/low tides
  const hiloResponse = await fetch(
    `${baseUrl}?station=${stationId}&product=predictions&datum=MLLW` +
    `&time_zone=lst_ldt&units=english&interval=hilo&format=json` +
    `&begin_date=${date}&end_date=${date}&application=BayAreaSurfAlmanac`
  );
  const hiloData = await hiloResponse.json();
  
  // Fetch hourly for chart curve
  const hourlyResponse = await fetch(
    `${baseUrl}?station=${stationId}&product=predictions&datum=MLLW` +
    `&time_zone=lst_ldt&units=english&interval=h&format=json` +
    `&begin_date=${date}&end_date=${date}&application=BayAreaSurfAlmanac`
  );
  const hourlyData = await hourlyResponse.json();
  
  return {
    highLow: hiloData.predictions.map((p: any) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: p.type
    })),
    hourly: hourlyData.predictions.map((p: any) => ({
      time: p.t,
      height: parseFloat(p.v),
      type: null
    }))
  };
}
```

**Rate Limits:**
- No API key required
- High/low predictions: limited to 10 years
- Hourly/6-minute: limited to 1 year per request
- Be courteous with request frequency

---

### 3. Weather Data (for Air Temperature, Visibility)

**Option A: Weather.gov API (Free, No Key)**
```
GET https://api.weather.gov/points/{lat},{lon}
# Returns forecast office and grid coordinates

GET https://api.weather.gov/gridpoints/{office}/{gridX},{gridY}/forecast
# Returns 7-day forecast with temps, wind, conditions
```

**Option B: Open-Meteo (Free, No Key)**
```
GET https://api.open-meteo.com/v1/forecast?
  latitude=37.7749
  &longitude=-122.4194
  &hourly=temperature_2m,windspeed_10m,winddirection_10m,visibility
  &temperature_unit=fahrenheit
  &windspeed_unit=mph
  &timezone=America/Los_Angeles
```

---

## OSRM Routing API - Drive Time Calculation

**Base URL:** `https://router.project-osrm.org/route/v1/driving/`

**Endpoint Format:**
```
GET https://router.project-osrm.org/route/v1/driving/{startLng},{startLat};{endLng},{endLat}?overview=false&annotations=duration
```

**Example - SF to Pacifica:**
```
GET https://router.project-osrm.org/route/v1/driving/-122.4194,37.7749;-122.484,37.793?overview=false&annotations=duration
```

**Response:**
```json
{
  "code": "Ok",
  "routes": [
    {
      "legs": [
        {
          "duration": 1380.5,  // seconds
          "distance": 12500.2  // meters
        }
      ],
      "duration": 1380.5,
      "distance": 12500.2
    }
  ]
}
```

**TypeScript Helper:**
```typescript
interface DriveTime {
  minutes: number;
  miles: number;
}

async function getDriveTime(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<DriveTime> {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/` +
    `${startLng},${startLat};${endLng},${endLat}` +
    `?overview=false&annotations=duration`
  );
  const data = await response.json();
  
  if (data.code !== 'Ok') throw new Error('Routing failed');
  
  return {
    minutes: Math.round(data.routes[0].duration / 60),
    miles: Math.round(data.routes[0].distance / 1609.34 * 10) / 10
  };
}
```

**Notes:**
- Free, no API key required
- Rate limits apply (be reasonable)
- Returns driving route, not straight-line distance

---

## Mapbox GL JS Integration

### Setup

**Install:**
```bash
npm install mapbox-gl
# Or with React wrapper:
npm install react-map-gl mapbox-gl
```

**Get Access Token:**
1. Create account at https://account.mapbox.com
2. Copy default public token or create new one
3. Store in `.env` as `VITE_MAPBOX_TOKEN`

### Basic Map Component (React)

```tsx
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

interface SurfSpot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  score: number;
  rating: string;
}

interface MapViewProps {
  spots: SurfSpot[];
  userLocation: { lat: number; lng: number };
  onSpotClick: (spotId: string) => void;
}

export function MapView({ spots, userLocation, onSpotClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [userLocation.lng, userLocation.lat],
      zoom: 9
    });

    map.current.on('load', () => setLoaded(true));

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add markers when map loads
  useEffect(() => {
    if (!loaded || !map.current) return;

    // Add user location marker
    new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<strong>Your Location</strong>'))
      .addTo(map.current);

    // Add surf spot markers
    spots.forEach((spot, index) => {
      const color = getMarkerColor(spot.rating);
      
      const el = document.createElement('div');
      el.className = 'surf-marker';
      el.innerHTML = `<span>${index + 1}</span>`;
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <strong>${spot.name}</strong>
          <div style="margin-top: 4px;">
            Score: ${spot.score}/100 (${spot.rating})
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.lng, spot.lat])
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => onSpotClick(spot.id));
    });

    // Fit bounds to show all spots
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([userLocation.lng, userLocation.lat]);
    spots.forEach(spot => bounds.extend([spot.lng, spot.lat]));
    map.current.fitBounds(bounds, { padding: 50 });

  }, [loaded, spots, userLocation]);

  return (
    <div 
      ref={mapContainer} 
      style={{ width: '100%', height: '400px', borderRadius: '12px' }}
    />
  );
}

function getMarkerColor(rating: string): string {
  switch (rating) {
    case 'Excellent': return '#10b981';
    case 'Good': return '#3b82f6';
    case 'Fair': return '#f59e0b';
    case 'Poor': return '#ef4444';
    default: return '#6b7280';
  }
}
```

### Alternative: Using react-map-gl

```tsx
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export function MapView({ spots, userLocation, onSpotClick }: MapViewProps) {
  const [selectedSpot, setSelectedSpot] = useState<SurfSpot | null>(null);

  return (
    <Map
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
      initialViewState={{
        longitude: userLocation.lng,
        latitude: userLocation.lat,
        zoom: 9
      }}
      style={{ width: '100%', height: 400, borderRadius: 12 }}
      mapStyle="mapbox://styles/mapbox/outdoors-v12"
    >
      <NavigationControl position="top-right" />
      
      {/* User location */}
      <Marker longitude={userLocation.lng} latitude={userLocation.lat}>
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
      </Marker>

      {/* Surf spots */}
      {spots.map((spot, index) => (
        <Marker
          key={spot.id}
          longitude={spot.lng}
          latitude={spot.lat}
          onClick={() => setSelectedSpot(spot)}
        >
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center
              text-white font-bold cursor-pointer border-2 border-white shadow-md
              ${getRatingClass(spot.rating)}`}
          >
            {index + 1}
          </div>
        </Marker>
      ))}

      {selectedSpot && (
        <Popup
          longitude={selectedSpot.lng}
          latitude={selectedSpot.lat}
          onClose={() => setSelectedSpot(null)}
          closeButton={true}
          anchor="bottom"
        >
          <div className="p-2">
            <strong>{selectedSpot.name}</strong>
            <div className="mt-1">
              Score: {selectedSpot.score}/100 ({selectedSpot.rating})
            </div>
            <button 
              onClick={() => onSpotClick(selectedSpot.id)}
              className="mt-2 text-cyan-600 hover:underline"
            >
              View Details →
            </button>
          </div>
        </Popup>
      )}
    </Map>
  );
}
```

---

## Scoring Algorithm - Complete Implementation

### Overview

The scoring algorithm rates each surf spot 0-100 based on how well conditions match the surfer's preferences. Higher scores = better conditions for that surfer type.

### Factors & Weights

| Factor | Weight | Description |
|--------|--------|-------------|
| Wave Height | 30% | Optimal range varies by skill level |
| Wave Period | 20% | Longer periods = cleaner, more powerful waves |
| Wind Speed | 20% | Lower wind = cleaner conditions |
| Wind Direction | 15% | Offshore > Cross > Onshore |
| Swell Direction | 10% | Spot-specific optimal directions |
| Tide Phase | 5% | Some spots work better at certain tides |

### Wave Height Scoring

```typescript
interface SkillConfig {
  minIdeal: number;  // feet
  maxIdeal: number;  // feet
  minSurfable: number;
  maxSurfable: number;
}

const SKILL_CONFIGS: Record<string, Record<string, SkillConfig>> = {
  longboard: {
    beginner:  { minIdeal: 1.5, maxIdeal: 3,   minSurfable: 1,   maxSurfable: 5 },
    advanced:  { minIdeal: 2,   maxIdeal: 5,   minSurfable: 1.5, maxSurfable: 7 },
    expert:    { minIdeal: 3,   maxIdeal: 6,   minSurfable: 2,   maxSurfable: 10 },
  },
  mediumboard: {
    beginner:  { minIdeal: 2,   maxIdeal: 4,   minSurfable: 1.5, maxSurfable: 6 },
    advanced:  { minIdeal: 3,   maxIdeal: 6,   minSurfable: 2,   maxSurfable: 8 },
    expert:    { minIdeal: 4,   maxIdeal: 8,   minSurfable: 2.5, maxSurfable: 12 },
  },
  shortboard: {
    beginner:  { minIdeal: 2.5, maxIdeal: 4,   minSurfable: 2,   maxSurfable: 6 },
    advanced:  { minIdeal: 3,   maxIdeal: 7,   minSurfable: 2.5, maxSurfable: 10 },
    expert:    { minIdeal: 4,   maxIdeal: 10,  minSurfable: 3,   maxSurfable: 15 },
  }
};

function scoreWaveHeight(
  height: number,
  surferType: string,
  skillLevel: string
): number {
  const config = SKILL_CONFIGS[surferType][skillLevel];
  
  // Perfect conditions
  if (height >= config.minIdeal && height <= config.maxIdeal) {
    return 100;
  }
  
  // Below ideal but surfable
  if (height >= config.minSurfable && height < config.minIdeal) {
    const range = config.minIdeal - config.minSurfable;
    const diff = config.minIdeal - height;
    return 100 - (diff / range) * 40;  // 60-100 range
  }
  
  // Above ideal but surfable
  if (height > config.maxIdeal && height <= config.maxSurfable) {
    const range = config.maxSurfable - config.maxIdeal;
    const diff = height - config.maxIdeal;
    return 100 - (diff / range) * 50;  // 50-100 range
  }
  
  // Too small
  if (height < config.minSurfable) {
    return Math.max(0, (height / config.minSurfable) * 30);
  }
  
  // Too big
  if (height > config.maxSurfable) {
    return Math.max(0, 30 - (height - config.maxSurfable) * 10);
  }
  
  return 0;
}
```

### Wave Period Scoring

```typescript
function scoreWavePeriod(period: number): number {
  // Period scoring (longer = better, generally)
  // < 8s: Wind swell, choppy (poor)
  // 8-10s: Mixed, less organized (fair)
  // 11-14s: Good groundswell (good)
  // 15+s: Long-period groundswell (excellent)
  
  if (period >= 15) return 100;
  if (period >= 13) return 90;
  if (period >= 11) return 75;
  if (period >= 9) return 55;
  if (period >= 7) return 35;
  return 20;
}
```

### Wind Scoring

```typescript
function scoreWind(
  speed: number,
  direction: number,
  spotOffshoreDirection: number  // direction that would be offshore for this spot
): number {
  // Wind speed score (lower = better)
  let speedScore: number;
  if (speed < 5) speedScore = 100;       // Glassy
  else if (speed < 10) speedScore = 85;  // Light
  else if (speed < 15) speedScore = 65;  // Moderate
  else if (speed < 20) speedScore = 40;  // Strong
  else if (speed < 25) speedScore = 20;  // Very strong
  else speedScore = 5;                    // Howling
  
  // Wind direction score
  const angleDiff = Math.abs(normalizeAngle(direction - spotOffshoreDirection));
  
  let directionMultiplier: number;
  if (angleDiff <= 45) {
    // Offshore (best)
    directionMultiplier = 1.0;
  } else if (angleDiff <= 90) {
    // Cross-offshore
    directionMultiplier = 0.85;
  } else if (angleDiff <= 135) {
    // Cross-onshore
    directionMultiplier = 0.6;
  } else {
    // Onshore (worst)
    directionMultiplier = 0.4;
  }
  
  // Light winds matter less for direction
  if (speed < 5) directionMultiplier = Math.max(0.9, directionMultiplier);
  
  return speedScore * directionMultiplier;
}

function normalizeAngle(angle: number): number {
  while (angle < -180) angle += 360;
  while (angle > 180) angle -= 360;
  return angle;
}
```

### Swell Direction Scoring

```typescript
interface SpotConfig {
  name: string;
  coordinates: { lat: number; lng: number };
  optimalSwellDirections: number[];  // degrees, can face multiple directions
  offshoreWindDirection: number;      // degrees
  bestTide: 'low' | 'mid' | 'high' | 'any';
}

const SPOT_CONFIGS: SpotConfig[] = [
  {
    name: 'Half Moon Bay (Mavericks Area)',
    coordinates: { lat: 37.494, lng: -122.501 },
    optimalSwellDirections: [270, 290, 310],  // W to NW
    offshoreWindDirection: 45,  // NE offshore
    bestTide: 'mid'
  },
  {
    name: 'Pacifica (Linda Mar)',
    coordinates: { lat: 37.593, lng: -122.504 },
    optimalSwellDirections: [260, 280, 300],  // WSW to WNW
    offshoreWindDirection: 90,  // E offshore
    bestTide: 'mid'
  },
  {
    name: 'Ocean Beach SF',
    coordinates: { lat: 37.760, lng: -122.510 },
    optimalSwellDirections: [270, 285, 300],  // W to WNW
    offshoreWindDirection: 90,  // E offshore
    bestTide: 'mid'
  },
  {
    name: 'Bolinas',
    coordinates: { lat: 37.909, lng: -122.686 },
    optimalSwellDirections: [250, 270, 290],  // WSW to WNW
    offshoreWindDirection: 45,  // NE offshore
    bestTide: 'any'
  },
  {
    name: 'Stinson Beach',
    coordinates: { lat: 37.902, lng: -122.644 },
    optimalSwellDirections: [250, 270, 290],  // WSW to WNW
    offshoreWindDirection: 45,  // NE offshore
    bestTide: 'mid'
  },
  // Add more spots...
];

function scoreSwellDirection(
  swellDirection: number,
  spotOptimalDirections: number[]
): number {
  // Find closest optimal direction
  let minDiff = 180;
  for (const optimal of spotOptimalDirections) {
    const diff = Math.abs(normalizeAngle(swellDirection - optimal));
    minDiff = Math.min(minDiff, diff);
  }
  
  if (minDiff <= 15) return 100;      // Direct hit
  if (minDiff <= 30) return 85;       // Very good
  if (minDiff <= 45) return 70;       // Good
  if (minDiff <= 60) return 50;       // Fair
  if (minDiff <= 90) return 30;       // Poor
  return 10;                           // Wrong direction
}
```

### Tide Scoring

```typescript
function scoreTide(
  currentTideHeight: number,
  tidePhase: 'rising' | 'falling' | 'high' | 'low',
  spotBestTide: 'low' | 'mid' | 'high' | 'any'
): number {
  if (spotBestTide === 'any') return 80;  // Neutral score
  
  // Estimate tide level (0-6ft typical range for SF)
  const tidePct = currentTideHeight / 6;  // 0 = low, 1 = high
  
  switch (spotBestTide) {
    case 'low':
      if (tidePct < 0.33) return 100;
      if (tidePct < 0.5) return 75;
      if (tidePct < 0.67) return 50;
      return 30;
      
    case 'mid':
      if (tidePct >= 0.33 && tidePct <= 0.67) return 100;
      if (tidePct >= 0.2 && tidePct <= 0.8) return 75;
      return 50;
      
    case 'high':
      if (tidePct > 0.67) return 100;
      if (tidePct > 0.5) return 75;
      if (tidePct > 0.33) return 50;
      return 30;
  }
  
  return 50;
}
```

### Combined Score Calculator

```typescript
interface SurfConditions {
  waveHeight: number;
  wavePeriod: number;
  swellDirection: number;
  windSpeed: number;
  windDirection: number;
  tideHeight: number;
  tidePhase: 'rising' | 'falling' | 'high' | 'low';
}

interface UserPreferences {
  surferType: 'longboard' | 'mediumboard' | 'shortboard';
  skillLevel: 'beginner' | 'advanced' | 'expert';
}

function calculateSpotScore(
  conditions: SurfConditions,
  spot: SpotConfig,
  prefs: UserPreferences
): { score: number; rating: string; breakdown: string } {
  
  const waveHeightScore = scoreWaveHeight(
    conditions.waveHeight, 
    prefs.surferType, 
    prefs.skillLevel
  );
  
  const wavePeriodScore = scoreWavePeriod(conditions.wavePeriod);
  
  const windScore = scoreWind(
    conditions.windSpeed,
    conditions.windDirection,
    spot.offshoreWindDirection
  );
  
  const swellScore = scoreSwellDirection(
    conditions.swellDirection,
    spot.optimalSwellDirections
  );
  
  const tideScore = scoreTide(
    conditions.tideHeight,
    conditions.tidePhase,
    spot.bestTide
  );
  
  // Weighted average
  const score = Math.round(
    waveHeightScore * 0.30 +
    wavePeriodScore * 0.20 +
    windScore * 0.20 +
    swellScore * 0.15 +
    (windScore * 0.10) +  // Wind direction component
    tideScore * 0.05
  );
  
  // Generate rating
  let rating: string;
  if (score >= 80) rating = 'Excellent';
  else if (score >= 60) rating = 'Good';
  else if (score >= 40) rating = 'Fair';
  else rating = 'Poor';
  
  // Generate breakdown text
  const breakdown = generateBreakdownText(
    conditions, 
    prefs, 
    waveHeightScore, 
    windScore
  );
  
  return { score, rating, breakdown };
}

function generateBreakdownText(
  conditions: SurfConditions,
  prefs: UserPreferences,
  waveScore: number,
  windScore: number
): string {
  const parts: string[] = [];
  
  // Wave assessment
  if (waveScore >= 80) {
    parts.push(`Excellent wave size (${conditions.waveHeight.toFixed(1)}ft) for ${prefs.skillLevel} progression.`);
  } else if (waveScore >= 60) {
    parts.push(`Good wave size (${conditions.waveHeight.toFixed(1)}ft) for developing skills.`);
  } else if (conditions.waveHeight > 6) {
    parts.push(`Large waves (${conditions.waveHeight.toFixed(1)}ft) - challenging for most surfers.`);
  } else {
    parts.push(`Small waves (${conditions.waveHeight.toFixed(1)}ft) - may be underwhelming.`);
  }
  
  // Wind assessment
  if (conditions.windSpeed < 8) {
    parts.push('Light winds with clean conditions.');
  } else if (conditions.windSpeed < 15) {
    parts.push(`Moderate winds (${Math.round(conditions.windSpeed)}mph) with manageable texture.`);
  } else {
    parts.push(`Strong winds (${Math.round(conditions.windSpeed)}mph) creating challenging conditions.`);
  }
  
  // Period assessment
  if (conditions.wavePeriod >= 12) {
    parts.push(`Good wave period (${conditions.wavePeriod.toFixed(1)}s) for consistent, workable surf.`);
  }
  
  parts.push('Data from NOAA buoy data.');
  
  return parts.join(' ');
}
```

---

## Data Models

### User Preferences (stored in localStorage as `surfPreferences`)
```typescript
interface SurfPreferences {
  surferType: 'shortboard' | 'mediumboard' | 'longboard';
  skillLevel: 'beginner' | 'advanced' | 'expert';
  homeAddress: string;
  homeCoordinates?: { lat: number; lng: number };
  email: string;
  dayPreference: 'current' | 'friday' | 'saturday' | 'sunday';
}
```

### Complete Surf Spot Data
```typescript
interface SurfSpotData {
  id: string;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number };
  region: string;
  
  // Calculated
  score: number;
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  scoreBreakdown: string;
  driveTimeMinutes: number;
  distanceMiles: number;
  
  // Conditions
  conditions: {
    waveHeight: number;
    wavePeriod: number;
    swellDirection: number;
    swellDirectionLabel: string;
    windSpeed: number;
    windDirection: string;
    waterTemp: number;
    airTempLow: number;
    airTempHigh: number;
    visibility: string;
    bestTimeStart: string;
    bestTimeEnd: string;
  };
  
  // Tides
  tides: {
    highLow: Array<{
      time: string;
      height: number;
      type: 'High Tide' | 'Low Tide';
    }>;
    hourly: Array<{
      hour: string;
      height: number;
    }>;
  };
}
```

---

## Known Surf Spots (Complete)

| # | Name | Lat | Lng | Region | Best Swell | Offshore Wind |
|---|------|-----|-----|--------|------------|---------------|
| 1 | Half Moon Bay (Mavericks) | 37.494 | -122.501 | Bay Area | W-NW | NE |
| 2 | Pacifica (Linda Mar) | 37.593 | -122.504 | Bay Area | W-WNW | E |
| 3 | Ocean Beach SF | 37.760 | -122.510 | Bay Area | W-WNW | E |
| 4 | Fort Point | 37.811 | -122.477 | Bay Area | W-NW | SE |
| 5 | Bolinas | 37.909 | -122.686 | Marin | W-SW | NE |
| 6 | Stinson Beach | 37.902 | -122.644 | Marin | W-SW | NE |
| 7 | Rodeo Beach | 37.833 | -122.538 | Bay Area | W-NW | E |
| 8 | Muir Beach | 37.859 | -122.578 | Marin | W-SW | E |
| 9 | Dillon Beach | 38.248 | -122.965 | Marin | W-NW | NE |
| 10 | Salmon Creek | 38.315 | -123.048 | Sonoma | NW-W | E |

---

## Color Palette

```css
:root {
  /* Primary */
  --cyan-500: #06b6d4;
  --cyan-100: #cffafe;
  --cyan-50: #ecfeff;
  
  /* Background */
  --bg-primary: #f0fdfa;
  --bg-card: #ffffff;
  
  /* Text */
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  
  /* Rating badges */
  --excellent: #10b981;
  --good: #3b82f6;
  --fair: #f59e0b;
  --poor: #ef4444;
  
  /* Chart colors */
  --tide-high: #3b82f6;
  --tide-low: #ef4444;
  --wave-line: #22c55e;
}
```

---

## Recommended File Structure

```
src/
├── components/
│   ├── Header.tsx
│   ├── BestSpotBanner.tsx
│   ├── SearchRadiusSlider.tsx
│   ├── DateTabs.tsx
│   ├── SpotCard.tsx
│   ├── TideChart.tsx
│   ├── MapView.tsx
│   ├── PreferencesForm.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Slider.tsx
│       └── Card.tsx
├── hooks/
│   ├── useSurfData.ts
│   ├── usePreferences.ts
│   ├── useDriveTime.ts
│   └── useTideData.ts
├── lib/
│   ├── api/
│   │   ├── noaa.ts
│   │   ├── tides.ts
│   │   ├── weather.ts
│   │   └── osrm.ts
│   ├── scoring.ts
│   ├── spots.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── App.tsx
└── main.tsx
```

---

## Getting Started with Claude Code

1. **Create project:**
   ```bash
   npm create vite@latest bay-area-surf-app -- --template react-ts
   cd bay-area-surf-app
   npm install
   ```

2. **Install dependencies:**
   ```bash
   npm install mapbox-gl @tanstack/react-query tailwindcss postcss autoprefixer
   npx tailwindcss init -p
   ```

3. **Set up environment:**
   ```bash
   echo "VITE_MAPBOX_TOKEN=your_token_here" > .env
   ```

4. **Start with data layer** - Get NOAA/tide APIs working first
5. **Build scoring algorithm** - This is the core logic
6. **Create components** - Start with SpotCard and TideChart
7. **Add map view** - Mapbox integration
8. **Polish UI** - Match the original design

---

*Generated from inspection of https://preview--bay-area-surf-almanac-08-remix.lovable.app/*
*API documentation from NOAA NDBC, CO-OPS, OSRM, and Mapbox*
