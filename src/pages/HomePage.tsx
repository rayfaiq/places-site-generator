import { useState, useEffect, useRef } from 'react'
import { Zap, Clipboard, ArrowRight, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { type PlaceData } from '../App'
import { GENERATE_FUNCTION_URL } from '../config'

const EXAMPLE_PLACES = [
  { label: 'Eiffel Tower, Paris', url: 'https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2922926,17z' },
  { label: 'Blue Bottle Coffee, SF', url: 'https://www.google.com/maps/place/Blue+Bottle+Coffee/@37.7749,-122.4194,17z' },
  { label: 'The Ritz London', url: 'https://www.google.com/maps/place/The+Ritz+London/@51.5071,-0.1441,17z' },
]

const STEPS = [
  'Parsing Maps URL…',
  'Fetching place data from Google…',
  'Generating AI copy with Claude…',
  'Building your page…',
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
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    }, 2000)
  }

  const handleGenerate = async (url?: string) => {
    const mapsUrl = url ?? inputValue
    if (!mapsUrl.trim()) return

    setError(null)
    setIsMissingKey(false)
    setIsLoading(true)
    setCurrentStep(0)
    setCompletedSteps(new Set())

    advanceStepsVisually()

    try {
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
    } catch {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current)
      if (!GENERATE_FUNCTION_URL) {
        setIsMissingKey(true)
      } else {
        setError('Network error. Please check your connection and try again.')
      }
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
        <a
          href="https://blink.new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: 'hsl(var(--foreground))' }}
        >
          Made with Blink
        </a>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 mb-8 animate-fade-in">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: 'hsl(var(--secondary))',
                color: 'hsl(var(--primary))',
                border: '1px solid hsl(var(--primary) / 0.2)',
              }}
            >
              <Zap className="w-3 h-3" />
              AI-Powered Site Generator
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5 animate-slide-up"
            style={{
              fontFamily: 'var(--font-serif)',
              color: 'hsl(var(--foreground))',
              animationDelay: '0.05s',
            }}
          >
            One link.{' '}
            <span style={{ color: 'hsl(var(--primary))' }}>One click.</span>
            <br />
            One beautiful website.
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg sm:text-xl mb-10 leading-relaxed animate-slide-up"
            style={{
              color: 'hsl(var(--muted-foreground))',
              fontFamily: 'var(--font-sans)',
              animationDelay: '0.1s',
            }}
          >
            Paste any Google Maps link and we'll instantly create a stunning
            landing page for that place.
          </p>

          {/* Input */}
          <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div
              className="relative flex items-center rounded-xl overflow-hidden mb-4 transition-all duration-200"
              style={{
                border: '2px solid hsl(var(--border))',
                background: 'hsl(var(--card))',
                boxShadow: '0 4px 24px hsl(var(--primary) / 0.06)',
              }}
              onFocus={() => {}}
            >
              <input
                type="url"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="https://www.google.com/maps/place/..."
                disabled={isLoading}
                className="flex-1 px-5 py-4 text-base bg-transparent outline-none placeholder-opacity-40"
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: 'hsl(var(--foreground))',
                }}
                onFocus={e => {
                  e.currentTarget.parentElement!.style.borderColor = 'hsl(var(--primary))'
                  e.currentTarget.parentElement!.style.boxShadow = '0 0 0 3px hsl(var(--primary) / 0.15), 0 4px 24px hsl(var(--primary) / 0.1)'
                }}
                onBlur={e => {
                  e.currentTarget.parentElement!.style.borderColor = 'hsl(var(--border))'
                  e.currentTarget.parentElement!.style.boxShadow = '0 4px 24px hsl(var(--primary) / 0.06)'
                }}
              />
              <button
                onClick={handlePaste}
                title="Paste from clipboard"
                disabled={isLoading}
                className="px-4 py-4 transition-colors disabled:opacity-40"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--primary))')}
                onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
              >
                <Clipboard className="w-5 h-5" />
              </button>
            </div>

            {/* Generate button */}
            <button
              onClick={() => handleGenerate()}
              disabled={isLoading || !inputValue.trim()}
              className="w-full py-4 px-8 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                fontFamily: 'var(--font-sans)',
                boxShadow: isLoading ? 'none' : '0 4px 16px hsl(var(--primary) / 0.35)',
                transform: 'translateY(0)',
              }}
              onMouseEnter={e => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 6px 24px hsl(var(--primary) / 0.4)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 16px hsl(var(--primary) / 0.35)'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  Generate Site
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p
              className="mt-3 text-xs text-center"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              Powered by Google Places API + Claude AI
            </p>
          </div>

          {/* Loading steps */}
          {isLoading && (
            <div
              className="mt-8 p-5 rounded-xl text-left animate-fade-in"
              style={{
                background: 'hsl(var(--secondary))',
                border: '1px solid hsl(var(--border))',
              }}
            >
              <div className="space-y-3">
                {STEPS.map((step, i) => {
                  const isCompleted = completedSteps.has(i)
                  const isActive = currentStep === i && !isCompleted
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
                        ) : isActive ? (
                          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                        ) : (
                          <div
                            className="w-5 h-5 rounded-full border-2"
                            style={{ borderColor: 'hsl(var(--border))' }}
                          />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{
                          color: isCompleted
                            ? 'hsl(var(--primary))'
                            : isActive
                            ? 'hsl(var(--foreground))'
                            : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        [{i + 1}] {step}
                        {isCompleted && ' ✓'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Missing API key error */}
          {isMissingKey && (
            <div
              className="mt-6 p-5 rounded-xl text-left animate-fade-in"
              style={{
                background: 'hsl(45 100% 97%)',
                border: '1px solid hsl(45 90% 75%)',
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(45 90% 45%)' }} />
                <div>
                  <p className="font-semibold text-sm mb-2" style={{ color: 'hsl(25 30% 20%)' }}>
                    Setup required — Google Places API key needed
                  </p>
                  <p className="text-sm mb-3" style={{ color: 'hsl(25 20% 35%)' }}>
                    To generate sites, add your Google Places API key as a project secret:
                  </p>
                  <ol className="text-sm space-y-2 list-decimal list-inside" style={{ color: 'hsl(25 20% 35%)' }}>
                    <li>Get a free key at <a href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Cloud Console</a> (enable <em>Places API New</em>)</li>
                    <li>In Blink, go to <strong>Workspace → Secrets</strong> and add:<br /><code className="px-1 py-0.5 rounded text-xs" style={{ background: 'hsl(45 80% 88%)' }}>GOOGLE_PLACES_API_KEY</code> = your key</li>
                    <li>The edge function will redeploy automatically with the new secret</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Generic error */}
          {error && !isMissingKey && (
            <div
              className="mt-6 p-4 rounded-xl flex items-start gap-3 animate-fade-in"
              style={{
                background: 'hsl(0 100% 97%)',
                border: '1px solid hsl(0 80% 85%)',
              }}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'hsl(0 80% 55%)' }} />
              <p className="text-sm" style={{ color: 'hsl(0 40% 30%)' }}>{error}</p>
            </div>
          )}

          {/* Example chips */}
          {!isLoading && (
            <div className="mt-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <p
                className="text-sm mb-3"
                style={{ color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--font-sans)' }}
              >
                Try with:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_PLACES.map(place => (
                  <button
                    key={place.label}
                    onClick={() => handleExample(place.url)}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: 'hsl(var(--card))',
                      color: 'hsl(var(--foreground))',
                      border: '1px solid hsl(var(--border))',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'hsl(var(--secondary))'
                      e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.4)'
                      e.currentTarget.style.color = 'hsl(var(--primary))'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'hsl(var(--card))'
                      e.currentTarget.style.borderColor = 'hsl(var(--border))'
                      e.currentTarget.style.color = 'hsl(var(--foreground))'
                    }}
                  >
                    {place.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Made with{' '}
          <a
            href="https://blink.new"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
            style={{ color: 'hsl(var(--primary))' }}
          >
            Blink
          </a>
        </p>
      </footer>
    </div>
  )
}
