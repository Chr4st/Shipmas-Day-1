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

interface Compliment {
  id: string
  text: string
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [compliment, setCompliment] = useState<Compliment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [loadingKey, setLoadingKey] = useState(0) // Force remount on retry

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
      try {
        // Log signals for debugging
        console.log('Fetching compliment with signals:', signals)
        
        const userKey = getUserKey()
        const avoidHashes = getAvoidHashes(200) // Last 200 hashes
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
        
        console.log('Request body:', { ...requestBody, avoidHashes: avoidHashes.length })

        const response = await fetch('/api/compliment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API error response:', errorText)
          throw new Error(`Failed to fetch compliment: ${response.status}`)
        }

        const data = await response.json()
        console.log('Received compliment:', data)
        setCompliment(data)
        addSeenComplimentHash(data.id) // id is the hash
        setError(null)
      } catch (err) {
        console.error('Error fetching compliment:', err)
        // Fallback compliment
        setCompliment({
          id: 'fallback',
          text: 'You are doing great, and your persistence is admirable.',
        })
        setError('Unable to load a new compliment, but here is one for you.')
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
          <div
            className="max-w-2xl text-center space-y-8 animate-fade-in"
            style={{
              animation: reducedMotion
                ? 'none'
                : 'fadeIn 1s ease-out, slideUp 1s ease-out',
            }}
          >
            {error && (
              <p className="text-sm text-gray-500 mb-4" role="alert">
                {error}
              </p>
            )}
            <h1 className="text-4xl md:text-6xl font-light text-white leading-tight">
              {compliment?.text}
            </h1>
            <button
              onClick={handleTryAgain}
              className="mt-12 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/20 transition-all duration-300 text-sm font-medium backdrop-blur-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-out, slideUp 1s ease-out;
        }
      `}</style>
    </main>
  )
}

