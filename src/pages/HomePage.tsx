import { useState, useEffect, useRef } from 'react'
import { Zap, Clipboard, ArrowRight, AlertTriangle, CheckCircle, Loader2, Heart, Trash2, Moon } from 'lucide-react'
import { type PlaceData } from '../App'
import { GENERATE_FUNCTION_URL } from '../config'
import { generateCopy, savePlaceResult, listSavedPlaces, deleteSavedPlace } from '../lib/place-utils'

const EXAMPLE_PLACES = [
  { label: 'Eiffel Tower, Paris', url: 'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2922926,17z' },
  { label: 'Blue Bottle Coffee, SF', url: 'https://www.google.com/maps/place/Blue+Bottle+Coffee/@37.7749,-122.4194,17z' },
  { label: 'The Ritz London', url: 'https://www.google.com/maps/place/The+Ritz+London/@51.5071,-0.1441,17z' },
]

const STEPS = [
  'Parsing Maps URL…',
  'Fetching place data from Google…',
  'Generating copy…',
  'Building page…',
]

type Step = 0 | 1 | 2 | 3

interface Props {
  onGenerate: (data: PlaceData) => void
}

export default function HomePage({ onGenerate }: Props) {
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<Step>(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isMissingKey, setIsMissingKey] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [savedPlaces, setSavedPlaces] = useState<any[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load saved places
  useEffect(() => {
    const places = listSavedPlaces()
    setSavedPlaces(places)
  }, [])

  useEffect(() => {
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
    }
  }, [])

  const advanceStepsVisually = () => {
    let step = 0
    stepTimerRef.current = setInterval(() => {
      if (step < 2) {
        setCompletedSteps(prev => new Set([...prev, step]))
        step++
        setCurrentStep(step as Step)
      } else {
        if (stepTimerRef.current) clearInterval(stepTimerRef.current)
      }
    }, 1500)
  }

  const handleGenerate = async (url?: string) => {
    const mapsUrl = url ?? inputValue
    if (!mapsUrl.trim()) return

    setError(null)
    setIsMissingKey(false)
    setIsLoading(true)
    setCurrentStep(0)
    setCompletedSteps(new Set())
    setShowSaved(false)

    advanceStepsVisually()

    try {
      // Try API first, fallback to client-side
      if (GENERATE_FUNCTION_URL) {
        const response = await fetch(GENERATE_FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapsUrl }),
        })

        if (stepTimerRef.current) clearInterval(stepTimerRef.current)

        const data = await response.json()

        if (!response.ok) {
          if (data?.error === 'MISSING_API_KEY' || data?.code === 'MISSING_API_KEY') {
            setIsMissingKey(true)
          } else {
            setError(data?.message || data?.error || 'Something went wrong. Please try again.')
          }
          setIsLoading(false)
          return
        }

        setCompletedSteps(new Set([0, 1, 2, 3]))
        setCurrentStep(3)
        setTimeout(() => {
          onGenerate(data as PlaceData)
        }, 400)
      } else {
        // Client-side fallback
        if (stepTimerRef.current) clearInterval(stepTimerRef.current)

        // Parse URL
        const urlInfo = parseMapUrl(mapsUrl)
        const textQuery = buildTextQuery(urlInfo)

        if (!textQuery) {
          setError('Could not parse the URL. Please try again.')
          setIsLoading(false)
          return
        }

        // Fetch from Google Places
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
        if (!apiKey) {
          setError('Google Places API key not configured.')
          setIsLoading(false)
          return
        }

        const placesData = await searchPlace(textQuery, apiKey, urlInfo.lat, urlInfo.lng)

        if (!placesData.places || placesData.places.length === 0) {
          setError('No place found. Please try another URL.')
          setIsLoading(false)
          return
        }

        const rawPlace = placesData.places[0]

        // Generate copy locally
        const copy = generateCopy(rawPlace)

        // Shape place data
        const openingHours = rawPlace.currentOpeningHours ?? rawPlace.regularOpeningHours
        const rawReviews = rawPlace.reviews ?? []
        const reviews = rawReviews.slice(0, 5).map((r: any) => ({
          author: r.authorAttribution?.displayName ?? "Anonymous",
          rating: r.rating ?? null,
          text: r.text?.text ?? "",
          relativeTime: r.relativePublishTimeDescription ?? "",
        }))

        const location = rawPlace.location
        const place = {
          name: rawPlace.displayName?.text ?? "",
          address: rawPlace.formattedAddress ?? "",
          phone: rawPlace.internationalPhoneNumber ?? "",
          website: rawPlace.websiteUri ?? "",
          rating: rawPlace.rating ?? null,
          totalRatings: rawPlace.userRatingCount ?? 0,
          priceLevel: rawPlace.priceLevel ?? "N/A",
          type: rawPlace.primaryTypeDisplayName?.text ?? "",
          location: location ? { lat: location.latitude ?? null, lng: location.longitude ?? null } : null,
          hours: openingHours
            ? {
                openNow: openingHours.openNow ?? null,
                periods: openingHours.periods ?? [],
                weekdayDescriptions: openingHours.weekdayDescriptions ?? [],
              }
            : null,
          photos: [],
          reviews,
          googleMapsUri: rawPlace.googleMapsUri ?? "",
          editorialSummary: rawPlace.editorialSummary?.text ?? "",
        }

        const result: PlaceData = { place, copy }
        setCompletedSteps(new Set([0, 1, 2, 3]))
        setCurrentStep(3)
        setTimeout(() => {
          onGenerate(result)
        }, 400)
      }
    } catch (err: any) {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
      setError(err.message || 'Network error. Please try again.')
      setIsLoading(false)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setInputValue(text)
    } catch {
      // clipboard not accessible
    }
  }

  const handleExample = (url: string) => {
    setInputValue(url)
    handleGenerate(url)
  }

  const handleSave = (data: PlaceData, key: string) => {
    const storageKey = savePlaceResult(data.place, data.copy)
    setSavedPlaces([...savedPlaces, { place: data.place, copy: data.copy, key: storageKey }])
    setSelectedKey(storageKey)
    alert('✅ Saved to your browser!')
  }

  const handleDelete = (key: string, event: React.MouseEvent) => {
    event.stopPropagation()
    deleteSavedPlace(key)
    setSavedPlaces(savedPlaces.filter(p => p.key !== key))
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Top bar */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <Zap className="w-4 h-4 text-white" fill="white" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-sans)', color: 'hsl(var(--foreground))' }}
          >
            PlaceGen
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors"
            style={{
              background: showSaved ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
              color: showSaved ? 'white' : 'hsl(var(--foreground))',
            }}
          >
            <Heart className="w-4 h-4" />
            {showSaved ? 'Hide Saved' : `Saved (${savedPlaces.length})`}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl mx-auto text-center">
          {showSaved && savedPlaces.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'hsl(var(--foreground))' }}>
                Your Saved Places
              </h2>
              <div className="space-y-3">
                {savedPlaces.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedKey(item.key)
                      onGenerate(item as any)
                    }}
                    className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.02]"
                    style={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                          {item.place.name}
                        </h3>
                        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {item.place.address}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(item.key, e)}
                        className="flex-shrink-0 p-2 rounded-lg hover:bg-red-100 transition-colors"
                        style={{ color: 'hsl(var(--destructive))' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSaved(false)}
                className="w-full mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: 'hsl(var(--muted))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                Continue Generating
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                Generate Place Pages
              </h1>
              <p className="text-sm mb-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
                Paste a Google Maps URL and get a beautiful landing page in seconds
              </p>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Paste Google Maps URL here..."
                    className="w-full px-4 py-3 pr-24 rounded-xl border-none focus:ring-2 transition-all"
                    style={{
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                      fontSize: '16px',
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={handlePaste}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                      style={{
                        background: 'hsl(var(--muted))',
                        color: 'hsl(var(--foreground))',
                      }}
                    >
                      Paste
                    </button>
                    <button
                      onClick={() => handleGenerate()}
                      disabled={!inputValue.trim() || isLoading}
                      className="px-4 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: isLoading ? 'hsl(var(--muted))' : 'hsl(var(--primary))',
                        color: isLoading ? 'hsl(var(--muted-foreground))' : 'white',
                      }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                          Generating
                        </>
                      ) : (
                        'Generate'
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'hsl(var(--destructive/0.1))', color: 'hsl(var(--destructive))' }}>
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    {error}
                  </div>
                )}

                {isMissingKey && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'hsl(var(--primary/0.1))', color: 'hsl(var(--primary))' }}>
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Google Places API key not configured. Use API mode for full features.
                  </div>
                )}

                <div className="pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-xs mb-2 font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Examples:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PLACES.map((example) => (
                      <button
                        key={example.url}
                        onClick={() => handleExample(example.url)}
                        className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                        style={{
                          background: 'hsl(var(--muted))',
                          color: 'hsl(var(--foreground))',
                        }}
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Loading Steps */}
              {isLoading && (
                <div className="mt-8 w-full max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                    <span className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                      {STEPS[currentStep]}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${((completedSteps.size) / 3) * 100}%`,
                        background: 'hsl(var(--primary))',
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 text-center" style={{ borderColor: 'hsl(var(--border))' }}>
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Data saved locally in your browser • No database needed
        </p>
      </footer>
    </div>
  )
}

// Helper functions for URL parsing
function parseMapUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl)
    const q = parsed.searchParams.get('q')
    if (q) {
      const coordsMatch = q.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
      if (coordsMatch) {
        return { placeName: null, lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]), searchQuery: null }
      }
      return { placeName: null, lat: null, lng: null, searchQuery: q }
    }
    const pathname = parsed.pathname
    const placeMatch = pathname.match(/\/maps\/place\/([^/@]+)/)
    if (placeMatch) return { placeName: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')), lat: null, lng: null, searchQuery: null }
    const coordMatch = pathname.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/)
    if (coordMatch) return { placeName: null, lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]), searchQuery: null }
    return { placeName: null, lat: null, lng: null, searchQuery: rawUrl }
  } catch {
    return { placeName: null, lat: null, lng: null, searchQuery: rawUrl }
  }
}

function buildTextQuery(info: any) {
  if (info.placeName) return info.placeName
  if (info.searchQuery) return info.searchQuery
  if (info.lat !== null && info.lng !== null) return `${info.lat},${info.lng}`
  return ""
}

async function searchPlace(query: string, apiKey: string, lat?: number | null, lng?: number | null) {
  const body = { textQuery: query }
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } }
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours,places.internationalPhoneNumber,places.websiteUri,places.photos,places.priceLevel,places.primaryTypeDisplayName,places.editorialSummary,places.reviews,places.googleMapsUri" },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return data
}
