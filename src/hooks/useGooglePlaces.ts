import { useState, useEffect, useRef } from 'react'
import type { PlaceSuggestion } from '../components/CompanySearch/CompanySearch.types'

// Minimal Google Maps Places types — keeps the component dependency-free
interface GPlacePrediction {
  place_id: string
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
}
interface GAutocompleteService {
  getPlacePredictions(
    request: { input: string; types?: string[] },
    callback: (predictions: GPlacePrediction[] | null, status: string) => void
  ): void
}
declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          AutocompleteService: new () => GAutocompleteService
        }
      }
    }
  }
}

// Module-level state so the script is loaded at most once across all instances
let scriptState: 'idle' | 'loading' | 'ready' | 'error' = 'idle'
const readyCallbacks: Array<() => void> = []

function loadScript(apiKey: string): Promise<void> {
  if (scriptState === 'ready') return Promise.resolve()
  if (scriptState === 'loading') return new Promise((res) => readyCallbacks.push(res))

  scriptState = 'loading'
  return new Promise((resolve, reject) => {
    readyCallbacks.push(resolve)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      scriptState = 'ready'
      readyCallbacks.forEach((cb) => cb())
      readyCallbacks.length = 0
    }
    script.onerror = () => {
      scriptState = 'error'
      reject(new Error('Failed to load Google Maps script'))
    }
    document.head.appendChild(script)
  })
}

export function useGooglePlaces(
  apiKey: string | undefined,
  query: string
): { suggestions: PlaceSuggestion[]; loading: boolean } {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const serviceRef = useRef<GAutocompleteService | null>(null)

  useEffect(() => {
    if (!apiKey || !query.trim()) {
      setSuggestions([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    loadScript(apiKey)
      .then(() => {
        if (cancelled) return
        if (!serviceRef.current && window.google) {
          serviceRef.current = new window.google.maps.places.AutocompleteService()
        }
        if (!serviceRef.current) {
          setLoading(false)
          return
        }
        serviceRef.current.getPlacePredictions(
          { input: query, types: ['establishment'] },
          (predictions, status) => {
            if (cancelled) return
            setLoading(false)
            if (status === 'OK' && predictions) {
              setSuggestions(
                predictions.map((p) => ({
                  placeId: p.place_id,
                  text: p.structured_formatting.main_text,
                  secondaryText: p.structured_formatting.secondary_text,
                }))
              )
            } else {
              setSuggestions([])
            }
          }
        )
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiKey, query])

  return { suggestions, loading }
}
