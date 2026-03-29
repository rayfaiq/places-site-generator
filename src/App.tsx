import { useState } from 'react'
import HomePage from './pages/HomePage'
import PlacePage from './pages/PlacePage'

export type PlaceData = {
  place: {
    name: string
    address: string
    phone?: string
    website?: string
    rating?: number
    totalRatings?: number
    priceLevel?: string
    type?: string
    location?: { lat: number; lng: number } | null
    hours?: {
      openNow?: boolean | null
      periods?: unknown[]
      weekdayDescriptions?: string[]
    } | null
    photos?: string[]
    reviews?: Array<{
      author: string
      rating: number
      text: string
      relativeTime: string
      profilePhoto?: string
    }>
    googleMapsUri?: string
    editorialSummary?: string
  }
  copy: {
    tagline: string
    headline: string
    description: string
    highlights: string[]
    callToAction: string
    ambiance: string
    bestFor: string
  }
}

function App() {
  const [placeData, setPlaceData] = useState<PlaceData | null>(null)

  if (placeData) {
    return <PlacePage data={placeData} onBack={() => setPlaceData(null)} />
  }
  return <HomePage onGenerate={setPlaceData} />
}

export default App
