import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getRatingColor } from '../lib/utils'

// Set access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

interface SurfSpot {
  id: string
  name: string
  region: string
  coordinates: { lat: number; lng: number }
  score: number
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  waveHeight?: number
}

interface MapViewProps {
  spots: SurfSpot[]
  userLocation?: { lat: number; lng: number }
  onSpotClick?: (spotId: string) => void
  selectedSpotId?: string
  height?: number | string
}

// Default to San Francisco center if no user location
const DEFAULT_CENTER: [number, number] = [-122.45, 37.75]
const DEFAULT_ZOOM = 9

export function MapView({
  spots,
  userLocation,
  onSpotClick,
  selectedSpotId,
  height = 400,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const center = userLocation
      ? [userLocation.lng, userLocation.lat] as [number, number]
      : DEFAULT_CENTER

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom: DEFAULT_ZOOM,
    })

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    // Add scale
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      // Clean up markers
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current.clear()

      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add/update markers when spots change
  useEffect(() => {
    if (!mapLoaded || !map.current) return

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current.clear()

    // Add user location marker
    if (userLocation) {
      const userEl = document.createElement('div')
      userEl.className = 'user-location-marker'
      userEl.innerHTML = `
        <div style="
          width: 16px;
          height: 16px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      `

      new mapboxgl.Marker(userEl)
        .setLngLat([userLocation.lng, userLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML('<strong>Your Location</strong>')
        )
        .addTo(map.current)
    }

    // Add spot markers
    spots.forEach((spot, index) => {
      const color = getRatingColor(spot.rating)
      const isSelected = spot.id === selectedSpotId

      // Create custom marker element
      const el = document.createElement('div')
      el.className = 'surf-spot-marker'
      el.innerHTML = `
        <div style="
          width: ${isSelected ? '40px' : '32px'};
          height: ${isSelected ? '40px' : '32px'};
          background: ${color};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: ${isSelected ? '16px' : '14px'};
          cursor: pointer;
          border: ${isSelected ? '3px' : '2px'} solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        ">${index + 1}</div>
      `

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="padding: 8px; min-width: 150px;">
          <div style="font-weight: 600; margin-bottom: 4px;">${spot.name}</div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${spot.region}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              background: ${color};
              color: white;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 500;
            ">${spot.rating}</span>
            <span style="font-size: 18px; font-weight: 700;">${spot.score}</span>
          </div>
          ${spot.waveHeight !== undefined ? `
            <div style="font-size: 12px; color: #6b7280; margin-top: 6px;">
              Waves: ${spot.waveHeight.toFixed(1)}ft
            </div>
          ` : ''}
        </div>
      `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([spot.coordinates.lng, spot.coordinates.lat])
        .setPopup(popup)
        .addTo(map.current!)

      // Click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSpotClick?.(spot.id)
      })

      markersRef.current.set(spot.id, marker)
    })

    // Fit bounds to show all spots
    if (spots.length > 0) {
      const bounds = new mapboxgl.LngLatBounds()

      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat])
      }

      spots.forEach((spot) => {
        bounds.extend([spot.coordinates.lng, spot.coordinates.lat])
      })

      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 11,
      })
    }
  }, [mapLoaded, spots, userLocation, selectedSpotId, onSpotClick])

  // Pan to selected spot
  useEffect(() => {
    if (!mapLoaded || !map.current || !selectedSpotId) return

    const spot = spots.find((s) => s.id === selectedSpotId)
    if (spot) {
      map.current.flyTo({
        center: [spot.coordinates.lng, spot.coordinates.lat],
        zoom: 11,
        duration: 1000,
      })

      // Open popup
      const marker = markersRef.current.get(selectedSpotId)
      marker?.togglePopup()
    }
  }, [selectedSpotId, mapLoaded, spots])

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    />
  )
}

// Mini map for spot cards
interface MiniMapProps {
  coordinates: { lat: number; lng: number }
  height?: number
}

export function MiniMap({ coordinates, height = 150 }: MiniMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [coordinates.lng, coordinates.lat],
      zoom: 12,
      interactive: false, // Static map
    })

    // Add marker
    new mapboxgl.Marker({ color: '#06b6d4' })
      .setLngLat([coordinates.lng, coordinates.lat])
      .addTo(map.current)

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [coordinates])

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  )
}

// Hook to get user's location
export function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    )
  }, [])

  return { location, error, loading, requestLocation }
}
