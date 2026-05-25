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
      <div className="bg-white rounded-[4px] border border-[#1A1C1E]/10 p-3 mb-4 animate-pulse">
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
    <div className="bg-white rounded-[4px] border border-[#1A1C1E]/10 p-3 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Weather Icon & Description */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getWeatherIcon(weatherCode)}</span>
          <div>
            <p className="text-sm font-medium text-[#1A1C1E]">
              {getWeatherDescription(weatherCode)}
            </p>
            {temp && (
              <p className="text-xs text-[#6C7278] font-label">{temp}</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-[#1A1C1E]/15 hidden sm:block"></div>

        {/* UV Index */}
        <div className="flex items-center gap-2">
          <span className="text-lg">☀️</span>
          <div>
            <p className="text-xs text-[#6C7278] font-label">UV Index</p>
            <p className="text-sm font-medium" style={{ color: uvInfo.color }}>
              {uvIndex.toFixed(0)} - {uvInfo.level}
            </p>
          </div>
        </div>

        {/* Precipitation */}
        {precipProb > 0 && (
          <>
            <div className="h-8 w-px bg-[#1A1C1E]/15 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="text-lg">💧</span>
              <div>
                <p className="text-xs text-[#6C7278] font-label">Rain Chance</p>
                <p className="text-sm font-medium text-[#1A1C1E]">
                  {precipProb}%
                </p>
              </div>
            </div>
          </>
        )}

        {/* Sunrise/Sunset */}
        {day && (
          <>
            <div className="h-8 w-px bg-[#1A1C1E]/15 hidden sm:block"></div>
            <div className="flex items-center gap-3 text-xs text-[#6C7278] font-label">
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
