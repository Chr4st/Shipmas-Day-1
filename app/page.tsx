'use client'

// Main page component
// Orchestrates the loading experience, API call, and compliment reveal

import { useState, useCallback, useEffect } from 'react'
import LoadingGift from '@/components/LoadingGift'
import {
  getUserKey,
  getSeenComplimentHashes,
  addSeenComplimentHash,
  getAvoidHashes,
} from '@/lib/entropy'
import { generateBehaviorReflection } from '@/lib/behaviorReflection'

interface Compliment {
  id: string
  text: string
}

interface UserSignals {
  pixelsMoved: number
  clicks: number
  idleMs: number
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [compliment, setCompliment] = useState<Compliment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [loadingKey, setLoadingKey] = useState(0) // Force remount on retry
  const [userSignals, setUserSignals] = useState<UserSignals | null>(null)
  const [showReveal, setShowReveal] = useState(false) // Abstract reveal signal state
  const [showCompliment, setShowCompliment] = useState(false) // Delayed compliment reveal
  const [showStats, setShowStats] = useState(false) // Statistics display

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const fetchCompliment = useCallback(
    async (signals: { pixelsMoved: number; clicks: number; idleMs: number }) => {
      // Store signals for later display
      setUserSignals(signals)

      // Show abstract reveal signal first
      setShowReveal(true)

      try {
        const userKey = getUserKey()
        const avoidHashes = getAvoidHashes(200)
        const env = {
          w: window.innerWidth,
          h: window.innerHeight,
          dpr: window.devicePixelRatio || 1,
          tzOffset: new Date().getTimezoneOffset(),
        }

        const requestBody = {
          pixelsMoved: signals.pixelsMoved,
          clicks: signals.clicks,
          idleMs: signals.idleMs,
          userKey,
          env,
          avoidHashes,
        }

        const response = await fetch('/api/compliment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch compliment: ${response.status}`)
        }

        const data = await response.json()

        // Delay compliment reveal after abstract signal
        setTimeout(() => {
          setShowReveal(false)
          setCompliment(data)
          addSeenComplimentHash(data.id)
          setShowCompliment(true)
          setError(null)

          // Show stats after compliment appears
          setTimeout(() => {
            setShowStats(true)
          }, 1500)
        }, 1200) // Wait for reveal signal to complete
      } catch (err) {
        console.error('Error fetching compliment:', err)
        setTimeout(() => {
          setShowReveal(false)
          setCompliment({
            id: 'fallback',
            text: 'You are doing great, and your persistence is admirable.',
          })
          setShowCompliment(true)
        }, 1200)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const handleTryAgain = useCallback(() => {
    setIsLoading(true)
    setCompliment(null)
    setError(null)
    setUserSignals(null)
    setShowReveal(false)
    setShowCompliment(false)
    setShowStats(false)
    setLoadingKey((prev) => prev + 1) // Force remount of LoadingGift to reset signals
  }, [])

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
      {isLoading ? (
        <LoadingGift
          key={loadingKey}
          onComplete={fetchCompliment}
          reducedMotion={reducedMotion}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full px-8">
          {/* Abstract reveal signal */}
          {showReveal && !showCompliment && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-32 h-32 rounded-full border-2 border-white/30"
                style={{
                  animation: reducedMotion
                    ? 'none'
                    : 'pulse 1.2s ease-in-out',
                  transform: 'scale(0)',
                }}
              />
            </div>
          )}

          {/* Compliment reveal */}
          {showCompliment && compliment && (
            <div
              className="max-w-2xl text-center space-y-6"
              style={{
                opacity: showCompliment ? 1 : 0,
                transition: 'opacity 1s ease-in',
              }}
            >
              <h1 className="text-4xl md:text-6xl font-light text-white leading-tight">
                {compliment.text}
              </h1>

              {/* Behavior reflection - subtle, no explanation */}
              {userSignals && (
                <p className="text-sm text-white/40 font-light italic mt-6">
                  {generateBehaviorReflection(userSignals)}
                </p>
              )}

              {/* Statistics display */}
              {showStats && userSignals && (
                <div className="mt-12 pt-8 border-t border-white/10">
                  <div className="grid grid-cols-3 gap-6 text-xs text-white/30">
                    <div>
                      <div className="text-white/50 mb-1">Distance</div>
                      <div className="text-white/70 font-mono">
                        {Math.round(userSignals.pixelsMoved).toLocaleString()} px
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 mb-1">Clicks</div>
                      <div className="text-white/70 font-mono">
                        {userSignals.clicks}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 mb-1">Time</div>
                      <div className="text-white/70 font-mono">
                        {Math.round(userSignals.idleMs / 1000)}s
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleTryAgain}
                className="mt-12 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all duration-300 text-sm font-medium backdrop-blur-sm"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </main>
  )
}

