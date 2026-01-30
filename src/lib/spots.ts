import type { SpotConfig } from '../types'

export const SURF_SPOTS: SpotConfig[] = [
  {
    id: 'half-moon-bay',
    name: 'Half Moon Bay (Mavericks)',
    description: 'World-famous big wave spot, also has smaller breaks nearby',
    coordinates: { lat: 37.494, lng: -122.501 },
    region: 'Bay Area',
    optimalSwellDirections: [270, 290, 310], // W to NW
    offshoreWindDirection: 45, // NE offshore
    bestTide: 'mid',
    buoyStation: '46012',
    tideStation: '9414290',
  },
  {
    id: 'pacifica-linda-mar',
    name: 'Pacifica (Linda Mar)',
    description: 'Popular beginner-friendly beach break with consistent waves',
    coordinates: { lat: 37.593, lng: -122.504 },
    region: 'Bay Area',
    optimalSwellDirections: [260, 280, 300], // WSW to WNW
    offshoreWindDirection: 90, // E offshore
    bestTide: 'mid',
    buoyStation: '46026',
    tideStation: '9414290',
  },
  {
    id: 'ocean-beach-sf',
    name: 'Ocean Beach SF',
    description: 'Powerful beach break, can get heavy. Not for beginners.',
    coordinates: { lat: 37.76, lng: -122.51 },
    region: 'Bay Area',
    optimalSwellDirections: [270, 285, 300], // W to WNW
    offshoreWindDirection: 90, // E offshore
    bestTide: 'mid',
    buoyStation: '46026',
    tideStation: '9414290',
  },
  {
    id: 'fort-point',
    name: 'Fort Point',
    description: 'Historic spot under the Golden Gate Bridge, needs big NW swell',
    coordinates: { lat: 37.811, lng: -122.477 },
    region: 'Bay Area',
    optimalSwellDirections: [270, 290, 310], // W to NW
    offshoreWindDirection: 135, // SE offshore
    bestTide: 'mid',
    buoyStation: '46237',
    tideStation: '9414290',
  },
  {
    id: 'bolinas',
    name: 'Bolinas',
    description: 'Mellow point break, great for longboarders',
    coordinates: { lat: 37.909, lng: -122.686 },
    region: 'Marin',
    optimalSwellDirections: [250, 270, 290], // WSW to WNW
    offshoreWindDirection: 45, // NE offshore
    bestTide: 'any',
    buoyStation: '46214',
    tideStation: '9415020',
  },
  {
    id: 'stinson-beach',
    name: 'Stinson Beach',
    description: 'Beautiful beach break with scenic views',
    coordinates: { lat: 37.902, lng: -122.644 },
    region: 'Marin',
    optimalSwellDirections: [250, 270, 290], // WSW to WNW
    offshoreWindDirection: 45, // NE offshore
    bestTide: 'mid',
    buoyStation: '46214',
    tideStation: '9415020',
  },
  {
    id: 'rodeo-beach',
    name: 'Rodeo Beach',
    description: 'Secluded beach break in the Marin Headlands',
    coordinates: { lat: 37.833, lng: -122.538 },
    region: 'Bay Area',
    optimalSwellDirections: [270, 285, 300], // W to NW
    offshoreWindDirection: 90, // E offshore
    bestTide: 'mid',
    buoyStation: '46026',
    tideStation: '9414290',
  },
  {
    id: 'muir-beach',
    name: 'Muir Beach',
    description: 'Small cove with occasional quality waves',
    coordinates: { lat: 37.859, lng: -122.578 },
    region: 'Marin',
    optimalSwellDirections: [250, 270, 290], // W to SW
    offshoreWindDirection: 90, // E offshore
    bestTide: 'mid',
    buoyStation: '46214',
    tideStation: '9415020',
  },
  {
    id: 'dillon-beach',
    name: 'Dillon Beach',
    description: 'Remote beach break with uncrowded waves',
    coordinates: { lat: 38.248, lng: -122.965 },
    region: 'Marin',
    optimalSwellDirections: [270, 285, 300], // W to NW
    offshoreWindDirection: 45, // NE offshore
    bestTide: 'mid',
    buoyStation: '46013',
    tideStation: '9415020',
  },
  {
    id: 'salmon-creek',
    name: 'Salmon Creek',
    description: 'Quality beach break on the Sonoma Coast',
    coordinates: { lat: 38.315, lng: -123.048 },
    region: 'Sonoma',
    optimalSwellDirections: [285, 300, 315], // NW to W
    offshoreWindDirection: 90, // E offshore
    bestTide: 'mid',
    buoyStation: '46013',
    tideStation: '9415020',
  },
]

// Buoy station info
export const BUOY_STATIONS = {
  '46012': {
    name: 'Half Moon Bay',
    location: '24NM SSW of San Francisco',
    coordinates: { lat: 37.356, lng: -122.881 },
  },
  '46026': {
    name: 'San Francisco',
    location: '18NM West of SF',
    coordinates: { lat: 37.75, lng: -122.838 },
  },
  '46237': {
    name: 'SF Bar',
    location: 'Near Golden Gate',
    coordinates: { lat: 37.788, lng: -122.634 },
  },
  '46214': {
    name: 'Point Reyes',
    location: '19NM WSW of Pt Reyes',
    coordinates: { lat: 37.946, lng: -123.469 },
  },
  '46013': {
    name: 'Bodega Bay',
    location: '48NM NNW of SF',
    coordinates: { lat: 38.253, lng: -123.303 },
  },
}

// Tide station info
export const TIDE_STATIONS = {
  '9414290': {
    name: 'San Francisco',
    location: 'Fort Point, Golden Gate',
  },
  '9415020': {
    name: 'Point Reyes',
    location: 'Marin County',
  },
  '9414523': {
    name: 'Redwood City',
    location: 'South Bay',
  },
  '9413450': {
    name: 'Monterey',
    location: 'South of HMB',
  },
}
