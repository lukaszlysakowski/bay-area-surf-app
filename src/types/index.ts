// User Preferences
export interface SurfPreferences {
  surferType: 'shortboard' | 'mediumboard' | 'longboard'
  skillLevel: 'beginner' | 'advanced' | 'expert'
  homeAddress: string
  homeCoordinates?: { lat: number; lng: number }
  email: string
  dayPreference: 'current' | 'friday' | 'saturday' | 'sunday'
}

// Buoy Data from NOAA
export interface BuoyData {
  timestamp: Date
  waveHeight: number // feet
  wavePeriod: number // seconds
  waveDirection: number // degrees
  windSpeed: number // mph
  windDirection: number // degrees
  waterTemp: number // °F
  airTemp: number // °F
}

// Tide Data
export interface TidePrediction {
  time: string
  height: number
  type: 'H' | 'L' | null // High, Low, or null for hourly
}

export interface TideData {
  highLow: TidePrediction[]
  hourly: TidePrediction[]
}

// Surf Conditions
export interface SurfConditions {
  waveHeight: number
  wavePeriod: number
  swellDirection: number
  windSpeed: number
  windDirection: number
  tideHeight: number
  tidePhase: 'rising' | 'falling' | 'high' | 'low'
  waterTemp?: number // °F
  airTemp?: number // °F
}

// Spot Configuration
export interface SpotConfig {
  id: string
  name: string
  description: string
  coordinates: { lat: number; lng: number }
  region: string
  optimalSwellDirections: number[] // degrees
  offshoreWindDirection: number // degrees
  bestTide: 'low' | 'mid' | 'high' | 'any'
  buoyStation: string // NOAA buoy station ID
  tideStation: string // NOAA tide station ID
  // Extended spot details
  breakType: 'beach' | 'point' | 'reef' | 'rivermouth'
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  hazards?: string[]
  parking?: string
  facilities?: string[]
  bestSeason?: string
  typicalCrowd?: 'empty' | 'light' | 'moderate' | 'crowded'
}

// Complete Surf Spot Data (with calculated fields)
export interface SurfSpotData {
  id: string
  name: string
  description: string
  coordinates: { lat: number; lng: number }
  region: string

  // Calculated
  score: number
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  scoreBreakdown: string
  driveTimeMinutes: number
  distanceMiles: number

  // Conditions
  conditions: {
    waveHeight: number
    wavePeriod: number
    swellDirection: number
    swellDirectionLabel: string
    windSpeed: number
    windDirection: string
    waterTemp: number
    airTempLow: number
    airTempHigh: number
    visibility: string
    bestTimeStart: string
    bestTimeEnd: string
  }

  // Tides
  tides: {
    highLow: Array<{
      time: string
      height: number
      type: 'High Tide' | 'Low Tide'
    }>
    hourly: Array<{
      hour: string
      height: number
    }>
  }
}

// Scoring
export interface ScoreResult {
  score: number
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  breakdown: string
}

export interface SkillConfig {
  minIdeal: number // feet
  maxIdeal: number // feet
  minSurfable: number
  maxSurfable: number
}

// Drive Time
export interface DriveTime {
  minutes: number
  miles: number
}

// API Response types
export interface NOAATideResponse {
  predictions: Array<{
    t: string
    v: string
    type?: 'H' | 'L'
  }>
}

export interface OSRMRouteResponse {
  code: string
  routes: Array<{
    duration: number // seconds
    distance: number // meters
    legs: Array<{
      duration: number
      distance: number
    }>
  }>
}
