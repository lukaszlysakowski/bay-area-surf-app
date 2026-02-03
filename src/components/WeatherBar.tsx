import { getWeatherIcon, getWeatherDescription, getUVLevel } from '../lib/api/weather'
import type { WeatherDay, WeatherForecast } from '../hooks/useWeather'

interface WeatherBarProps {
  weather: WeatherForecast | undefined
  dayWeather: WeatherDay | undefined
  isLoading?: boolean
}

export function WeatherBar({ weather, dayWeather, isLoading }: WeatherBarProps) {
  if (isLoading) {
    return (
      <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-700 p-3 mb-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!weather && !dayWeather) return null

  // Use day weather if available, otherwise current
  const current = weather?.current
  const day = dayWeather

  const temp = day ? `${Math.round(day.temperatureMin)}° - ${Math.round(day.temperatureMax)}°`
    : current ? `${Math.round(current.temperature)}°F` : null

  const weatherCode = day?.weatherCode ?? current?.weatherCode ?? 0
  const uvIndex = day?.uvIndexMax ?? current?.uvIndex ?? 0
  const precipProb = day?.precipitationProbability ?? 0
  const uvInfo = getUVLevel(uvIndex)

  return (
    <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-sky-200 dark:border-gray-700 p-3 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Weather Icon & Description */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getWeatherIcon(weatherCode)}</span>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {getWeatherDescription(weatherCode)}
            </p>
            {temp && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{temp}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>

        {/* UV Index */}
        <div className="flex items-center gap-2">
          <span className="text-lg">☀️</span>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">UV Index</p>
            <p className="text-sm font-medium" style={{ color: uvInfo.color }}>
              {uvIndex.toFixed(0)} - {uvInfo.level}
            </p>
          </div>
        </div>

        {/* Precipitation */}
        {precipProb > 0 && (
          <>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💧</span>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Rain Chance</p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {precipProb}%
                </p>
              </div>
            </div>
          </>
        )}

        {/* Sunrise/Sunset */}
        {day && (
          <>
            <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>🌅 {formatTime(day.sunrise)}</span>
              <span>🌇 {formatTime(day.sunset)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
