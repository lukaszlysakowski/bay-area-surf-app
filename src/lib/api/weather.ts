/**
 * Open-Meteo Weather API Integration
 * For air temperature, UV index, precipitation, and weather conditions
 * https://open-meteo.com/en/docs
 */

export interface WeatherHour {
  time: Date
  temperature: number        // °F
  apparentTemperature: number // °F (feels like)
  precipitation: number      // mm
  precipitationProbability: number // %
  weatherCode: number
  cloudCover: number         // %
  uvIndex: number
  visibility: number         // meters
}

export interface WeatherDay {
  date: Date
  temperatureMax: number     // °F
  temperatureMin: number     // °F
  precipitationSum: number   // mm
  precipitationProbability: number // %
  uvIndexMax: number
  weatherCode: number
  sunrise: Date
  sunset: Date
  hourly: WeatherHour[]
}

export interface WeatherForecast {
  latitude: number
  longitude: number
  days: WeatherDay[]
  current: WeatherHour | null
  generatedAt: Date
}

interface OpenMeteoWeatherResponse {
  latitude: number
  longitude: number
  current?: {
    time: string
    temperature_2m: number
    apparent_temperature: number
    precipitation: number
    weather_code: number
    cloud_cover: number
    uv_index: number
    visibility: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    apparent_temperature: number[]
    precipitation: number[]
    precipitation_probability: number[]
    weather_code: number[]
    cloud_cover: number[]
    uv_index: number[]
    visibility: number[]
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    precipitation_probability_max: number[]
    uv_index_max: number[]
    weather_code: number[]
    sunrise: string[]
    sunset: string[]
  }
}

/**
 * Fetch weather forecast from Open-Meteo
 */
export async function fetchWeatherForecast(
  lat: number,
  lng: number,
  days: number = 7
): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'uv_index',
      'visibility',
    ].join(','),
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation',
      'precipitation_probability',
      'weather_code',
      'cloud_cover',
      'uv_index',
      'visibility',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'uv_index_max',
      'weather_code',
      'sunrise',
      'sunset',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'America/Los_Angeles',
    forecast_days: days.toString(),
  })

  const url = `https://api.open-meteo.com/v1/forecast?${params}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`Open-Meteo Weather API error: ${response.status}`)
      throw new Error(`Open-Meteo Weather API error: ${response.status}`)
    }

    const data: OpenMeteoWeatherResponse = await response.json()
    return parseWeatherResponse(data)
  } catch (error) {
    console.error('Error fetching Open-Meteo weather data:', error)
    throw error
  }
}

/**
 * Parse Open-Meteo weather response
 */
function parseWeatherResponse(data: OpenMeteoWeatherResponse): WeatherForecast {
  // Parse current conditions
  let current: WeatherHour | null = null
  if (data.current) {
    current = {
      time: new Date(data.current.time),
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      precipitation: data.current.precipitation,
      precipitationProbability: 0,
      weatherCode: data.current.weather_code,
      cloudCover: data.current.cloud_cover,
      uvIndex: data.current.uv_index,
      visibility: data.current.visibility,
    }
  }

  // Parse hourly data
  const hourlyData: WeatherHour[] = []
  for (let i = 0; i < data.hourly.time.length; i++) {
    hourlyData.push({
      time: new Date(data.hourly.time[i]),
      temperature: data.hourly.temperature_2m[i],
      apparentTemperature: data.hourly.apparent_temperature[i],
      precipitation: data.hourly.precipitation[i],
      precipitationProbability: data.hourly.precipitation_probability[i],
      weatherCode: data.hourly.weather_code[i],
      cloudCover: data.hourly.cloud_cover[i],
      uvIndex: data.hourly.uv_index[i],
      visibility: data.hourly.visibility[i],
    })
  }

  // Group hourly by day
  const hourlyByDay = new Map<string, WeatherHour[]>()
  for (const hour of hourlyData) {
    const dateKey = hour.time.toDateString()
    if (!hourlyByDay.has(dateKey)) {
      hourlyByDay.set(dateKey, [])
    }
    hourlyByDay.get(dateKey)!.push(hour)
  }

  // Parse daily data
  const days: WeatherDay[] = []
  for (let i = 0; i < data.daily.time.length; i++) {
    const date = new Date(data.daily.time[i])
    const dateKey = date.toDateString()

    days.push({
      date,
      temperatureMax: data.daily.temperature_2m_max[i],
      temperatureMin: data.daily.temperature_2m_min[i],
      precipitationSum: data.daily.precipitation_sum[i],
      precipitationProbability: data.daily.precipitation_probability_max[i],
      uvIndexMax: data.daily.uv_index_max[i],
      weatherCode: data.daily.weather_code[i],
      sunrise: new Date(data.daily.sunrise[i]),
      sunset: new Date(data.daily.sunset[i]),
      hourly: hourlyByDay.get(dateKey) || [],
    })
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    days,
    current,
    generatedAt: new Date(),
  }
}

/**
 * Get weather description from WMO weather code
 */
export function getWeatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with heavy hail',
  }
  return descriptions[code] || 'Unknown'
}

/**
 * Get weather icon/emoji from WMO weather code
 */
export function getWeatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌧️'
  if (code <= 65) return '🌧️'
  if (code <= 75) return '❄️'
  if (code <= 82) return '🌦️'
  if (code >= 95) return '⛈️'
  return '☁️'
}

/**
 * Get UV index level description
 */
export function getUVLevel(uvIndex: number): { level: string; color: string } {
  if (uvIndex <= 2) return { level: 'Low', color: '#22c55e' }
  if (uvIndex <= 5) return { level: 'Moderate', color: '#eab308' }
  if (uvIndex <= 7) return { level: 'High', color: '#f97316' }
  if (uvIndex <= 10) return { level: 'Very High', color: '#ef4444' }
  return { level: 'Extreme', color: '#7c3aed' }
}
