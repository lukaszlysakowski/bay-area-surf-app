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
    breakType: 'reef',
    skillLevel: 'expert',
    hazards: ['Heavy waves', 'Rocks', 'Strong currents', 'Cold water', 'Sharks'],
    parking: 'Limited parking at Pillar Point Harbor, arrive early',
    facilities: ['Restrooms', 'Showers at harbor'],
    bestSeason: 'October - March (big wave season)',
    typicalCrowd: 'light',
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
    breakType: 'beach',
    skillLevel: 'beginner',
    hazards: ['Rip currents', 'Crowded lineup'],
    parking: 'Large parking lot at Linda Mar Beach ($3/hour)',
    facilities: ['Restrooms', 'Showers', 'Taco Bell nearby', 'Surf shop rentals'],
    bestSeason: 'Year-round, best in fall',
    typicalCrowd: 'crowded',
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
    breakType: 'beach',
    skillLevel: 'advanced',
    hazards: ['Heavy shorebreak', 'Strong rips', 'Cold water', 'Sharks', 'Sneaker waves'],
    parking: 'Free street parking along Great Highway',
    facilities: ['Restrooms at various locations', 'Beach Chalet restaurant'],
    bestSeason: 'Fall and winter for best waves',
    typicalCrowd: 'moderate',
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
    breakType: 'point',
    skillLevel: 'advanced',
    hazards: ['Rocks', 'Strong currents', 'Ship traffic', 'Cold water'],
    parking: 'Limited parking at Fort Point, arrive very early',
    facilities: ['Restrooms at Fort Point'],
    bestSeason: 'Winter (needs big NW swell to break)',
    typicalCrowd: 'light',
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
    breakType: 'point',
    skillLevel: 'intermediate',
    hazards: ['Localism (be respectful)', 'Rocky bottom'],
    parking: 'Street parking in town, respect locals',
    facilities: ['Limited - small town'],
    bestSeason: 'Year-round',
    typicalCrowd: 'moderate',
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
    breakType: 'beach',
    skillLevel: 'intermediate',
    hazards: ['Sharks (Red Triangle)', 'Rip currents'],
    parking: 'Public lot and street parking',
    facilities: ['Restrooms', 'Showers', 'Cafes in town'],
    bestSeason: 'Fall for cleanest conditions',
    typicalCrowd: 'moderate',
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
    breakType: 'beach',
    skillLevel: 'intermediate',
    hazards: ['Rip currents', 'Rocky sides', 'Cold water'],
    parking: 'Free parking lot (closes at sunset)',
    facilities: ['Restrooms', 'Marine Mammal Center nearby'],
    bestSeason: 'Fall and winter',
    typicalCrowd: 'light',
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
    breakType: 'beach',
    skillLevel: 'intermediate',
    hazards: ['Rocks on sides', 'Small takeoff zone'],
    parking: 'Small parking lot (fills quickly on weekends)',
    facilities: ['Restrooms', 'Pelican Inn pub nearby'],
    bestSeason: 'Fall',
    typicalCrowd: 'light',
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
    breakType: 'beach',
    skillLevel: 'intermediate',
    hazards: ['Remote location', 'Strong currents', 'Cold water'],
    parking: 'Paid parking at Dillon Beach Resort',
    facilities: ['Restrooms', 'General store'],
    bestSeason: 'Fall and winter',
    typicalCrowd: 'empty',
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
    breakType: 'beach',
    skillLevel: 'intermediate',
    hazards: ['Strong currents', 'Cold water', 'Remote'],
    parking: 'Free parking lot at beach',
    facilities: ['Restrooms', 'Bodega Bay town 10min away'],
    bestSeason: 'Fall and winter',
    typicalCrowd: 'light',
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

// Helper to get cardinal direction from degrees
export function getCardinalDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

// Helper to get swell source description
export function getSwellSource(degrees: number): { direction: string; source: string; arrow: string } {
  const cardinal = getCardinalDirection(degrees)

  // Determine the source region based on direction
  let source = ''
  if (degrees >= 270 && degrees <= 315) {
    source = 'North Pacific / Alaska'
  } else if (degrees >= 225 && degrees < 270) {
    source = 'West Pacific'
  } else if (degrees >= 180 && degrees < 225) {
    source = 'South Pacific / Southern Hemisphere'
  } else if (degrees >= 315 || degrees < 45) {
    source = 'North Pacific / Gulf of Alaska'
  } else {
    source = 'Local wind swell'
  }

  // Arrow pointing the direction the swell is coming FROM
  const arrows: Record<string, string> = {
    'N': '↓', 'NNE': '↙', 'NE': '↙', 'ENE': '←',
    'E': '←', 'ESE': '←', 'SE': '↖', 'SSE': '↖',
    'S': '↑', 'SSW': '↗', 'SW': '↗', 'WSW': '→',
    'W': '→', 'WNW': '→', 'NW': '↘', 'NNW': '↘'
  }

  return {
    direction: cardinal,
    source,
    arrow: arrows[cardinal] || '→'
  }
}

// Historical averages by month (synthetic data based on typical NorCal patterns)
export const HISTORICAL_AVERAGES: Record<number, { avgScore: number; avgWaveHeight: number; goodDaysPct: number }> = {
  0: { avgScore: 68, avgWaveHeight: 6.5, goodDaysPct: 45 },  // January
  1: { avgScore: 65, avgWaveHeight: 5.8, goodDaysPct: 40 },  // February
  2: { avgScore: 58, avgWaveHeight: 4.5, goodDaysPct: 35 },  // March
  3: { avgScore: 52, avgWaveHeight: 3.5, goodDaysPct: 30 },  // April
  4: { avgScore: 48, avgWaveHeight: 3.0, goodDaysPct: 25 },  // May
  5: { avgScore: 45, avgWaveHeight: 2.5, goodDaysPct: 20 },  // June
  6: { avgScore: 42, avgWaveHeight: 2.2, goodDaysPct: 18 },  // July
  7: { avgScore: 44, avgWaveHeight: 2.5, goodDaysPct: 20 },  // August
  8: { avgScore: 55, avgWaveHeight: 3.5, goodDaysPct: 35 },  // September
  9: { avgScore: 65, avgWaveHeight: 5.0, goodDaysPct: 45 },  // October
  10: { avgScore: 70, avgWaveHeight: 6.0, goodDaysPct: 50 }, // November
  11: { avgScore: 72, avgWaveHeight: 7.0, goodDaysPct: 52 }, // December
}

// Calculate historical percentile
export function getHistoricalPercentile(score: number): number {
  const month = new Date().getMonth()
  const monthData = HISTORICAL_AVERAGES[month]

  // Use a simple normal distribution approximation
  // stdDev is roughly 15 points for surf scores
  const stdDev = 15
  const zScore = (score - monthData.avgScore) / stdDev

  // Convert z-score to percentile (approximation)
  // Using the cumulative distribution function approximation
  const percentile = Math.round(50 * (1 + Math.tanh(zScore * 0.8)))

  return Math.max(1, Math.min(99, percentile))
}

// Get historical context message
export function getHistoricalContext(score: number): string {
  const percentile = getHistoricalPercentile(score)
  const month = new Date().toLocaleDateString('en-US', { month: 'long' })

  if (percentile >= 90) {
    return `Top 10% day for ${month}!`
  } else if (percentile >= 75) {
    return `Better than ${percentile}% of ${month} days`
  } else if (percentile >= 50) {
    return `Above average for ${month}`
  } else if (percentile >= 25) {
    return `Typical ${month} conditions`
  } else {
    return `Below average for ${month}`
  }
}
