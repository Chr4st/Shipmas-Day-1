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
  const [showCompliment, setShowCompliment] = useState(false) // Delayed compliment reveal
  const [showStats, setShowStats] = useState(false) // Statistics display
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

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

        // Show compliment immediately
        setCompliment(data)
        addSeenComplimentHash(data.id)
        setShowCompliment(true)
        setError(null)

        // Show stats after compliment appears
        setTimeout(() => {
          setShowStats(true)
        }, 1500)
      } catch (err) {
        console.error('Error fetching compliment:', err)
        setCompliment({
          id: 'fallback',
          text: 'You are doing great, and your persistence is admirable.',
        })
        setShowCompliment(true)
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
    setShowCompliment(false)
    setShowStats(false)
    setLoadingKey((prev) => prev + 1) // Force remount of LoadingGift to reset signals
  }, [])

  // Cursor follow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Cursor follow effects */}
      {!isLoading && (
        <>
          <div
            className="fixed pointer-events-none z-50 mix-blend-difference"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              transform: 'translate(-50%, -50%)',
              transition: 'transform 0.1s ease-out',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/80 blur-sm" />
          </div>
          <div
            className="fixed pointer-events-none z-50"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              transform: 'translate(-50%, -50%)',
              transition: 'transform 0.15s ease-out',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white/60" />
          </div>
        </>
      )}

      {isLoading ? (
        <LoadingGift
          key={loadingKey}
          onComplete={fetchCompliment}
          reducedMotion={reducedMotion}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full px-8">
          {/* Compliment reveal */}
          {showCompliment && compliment && (
            <div
              className="max-w-3xl text-center space-y-8"
              style={{
                opacity: showCompliment ? 1 : 0,
                transition: 'opacity 1s ease-in',
              }}
            >
              <h1 className="text-4xl md:text-6xl font-light text-white leading-tight">
                {compliment.text}
              </h1>

              {/* Personal Key */}
              <div className="mt-8 pt-6 border-t border-white/20">
                <p className="text-sm text-white/50 mb-2">Your personal key</p>
                <p className="text-lg font-mono text-white/80 tracking-wider break-all px-4">
                  {compliment.id}
                </p>
                <p className="text-xs text-white/40 mt-2 italic">
                  This is your personal key now.
                </p>
              </div>

              {/* Behavior reflection */}
              {userSignals && (
                <p className="text-base text-white/50 font-light italic mt-4">
                  {generateBehaviorReflection(userSignals)}
                </p>
              )}

              {/* Statistics display - bigger and more prominent */}
              {showStats && userSignals && (
                <div className="mt-16 pt-12 border-t border-white/20">
                  <h2 className="text-2xl font-light text-white mb-8">Your journey</h2>
                  <div className="grid grid-cols-3 gap-12">
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl font-mono text-white mb-2">
                        {Math.round(userSignals.pixelsMoved).toLocaleString()}
                      </div>
                      <div className="text-lg text-white/60 uppercase tracking-wider">
                        Pixels
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl font-mono text-white mb-2">
                        {userSignals.clicks}
                      </div>
                      <div className="text-lg text-white/60 uppercase tracking-wider">
                        Clicks
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl md:text-5xl font-mono text-white mb-2">
                        {Math.round(userSignals.idleMs / 1000)}s
                      </div>
                      <div className="text-lg text-white/60 uppercase tracking-wider">
                        Time
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleTryAgain}
                className="mt-16 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all duration-300 text-sm font-medium backdrop-blur-sm"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

