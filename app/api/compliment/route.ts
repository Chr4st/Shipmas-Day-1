// API endpoint for compliment selection
// Validates inputs, computes entropy-based selection, enforces dedupe via avoidHashes
// Uses public Compliments API: https://compliments-api.vercel.app/random

import { NextRequest, NextResponse } from 'next/server'
import {
  selectComplimentFromCandidates,
  type UserSignals,
  type EnvData,
} from '@/lib/entropy'
import { fetchPool } from '@/lib/fetchPool'
import { fallbackCompliments } from '@/lib/fallbackCompliments'
import crypto from 'crypto'

// Hash a string using SHA-256
function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

// Fetch a single compliment from the public API
async function fetchCompliment(): Promise<string> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('https://compliments-api.vercel.app/random', {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    // Handle different possible response formats
    const text = data.compliment || data.text || data.message || data.complimentText || ''
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid API response format')
    }
    
    return text.trim()
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw new Error(`Failed to fetch compliment: ${error.message}`)
    }
    throw error
  }
}

// Normalize compliment text
function normalizeCompliment(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate inputs
    const {
      pixelsMoved,
      clicks,
      idleMs,
      userKey,
      env,
      avoidHashes = [],
    }: {
      pixelsMoved: number
      clicks: number
      idleMs: number
      userKey: string
      env: EnvData
      avoidHashes?: string[]
    } = body

    // Clamp obviously bad values
    const clampedPixelsMoved = Math.max(0, Math.min(pixelsMoved, 1000000))
    const clampedClicks = Math.max(0, Math.min(clicks, 10000))
    const clampedIdleMs = Math.max(0, Math.min(idleMs, 60000))

    if (
      typeof clampedPixelsMoved !== 'number' ||
      typeof clampedClicks !== 'number' ||
      typeof clampedIdleMs !== 'number' ||
      typeof userKey !== 'string' ||
      !env ||
      typeof env.w !== 'number' ||
      typeof env.h !== 'number' ||
      typeof env.dpr !== 'number' ||
      typeof env.tzOffset !== 'number' ||
      !Array.isArray(avoidHashes)
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    const signals: UserSignals = {
      pixelsMoved: clampedPixelsMoved,
      clicks: clampedClicks,
      idleMs: clampedIdleMs,
    }

    const avoidHashesSet = new Set(avoidHashes)

    // Generate a session nonce for this request to ensure uniqueness
    // This ensures "Try again" gets a different selection even with same signals
    const sessionNonce = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // Try fetching from public API (up to 3 rounds)
    let selectedCompliment: { complimentText: string; complimentHash: string } | null = null
    let rounds = 0
    const maxRounds = 3
    const batchSize = 18
    const concurrency = 5

    while (!selectedCompliment && rounds < maxRounds) {
      rounds++
      console.log(`Attempting API fetch round ${rounds}/${maxRounds}`)

      try {
        // Fetch batch of compliments
        const fetchedTexts = await fetchPool(
          'https://compliments-api.vercel.app/random',
          batchSize,
          concurrency,
          fetchCompliment
        )

        console.log(`Round ${rounds}: Fetched ${fetchedTexts.length} compliments from API`)

        if (fetchedTexts.length === 0) {
          console.warn(`Round ${rounds}: No compliments fetched from API`)
          continue // Try next round
        }

        // Normalize and dedupe within batch
        const normalized = fetchedTexts
          .map(normalizeCompliment)
          .filter((text) => text.length > 0)

        if (normalized.length === 0) {
          console.warn(`Round ${rounds}: All fetched compliments were empty after normalization`)
          continue // Try next round
        }

        // Try to select from this batch with session nonce for uniqueness
        try {
          const result = selectComplimentFromCandidates(
            signals,
            userKey,
            env,
            normalized,
            avoidHashesSet,
            sessionNonce
          )

          // Double-check the selected compliment is not in avoidHashes
          if (!avoidHashesSet.has(result.complimentHash)) {
            selectedCompliment = {
              complimentText: result.complimentText,
              complimentHash: result.complimentHash,
            }
            break
          } else {
            console.warn(`Round ${rounds}: Selected compliment was in avoidHashes, trying next round`)
          }
        } catch (selectError) {
          console.error(`Round ${rounds}: Selection error:`, selectError)
          continue
        }
      } catch (fetchError) {
        // Fetch failed, try next round or fallback
        console.error(`Round ${rounds}: Fetch error:`, fetchError)
        continue
      }
    }

    // Fallback to embedded list if API failed or all were avoided
    if (!selectedCompliment) {
      console.log('Falling back to embedded compliments list', {
        fallbackCount: fallbackCompliments.length,
        avoidHashesCount: avoidHashesSet.size,
      })
      
      // Filter out avoided compliments from fallback list
      const availableFallbacks = fallbackCompliments.filter((text) => {
        const normalized = normalizeCompliment(text)
        const hash = hashString(normalized)
        return !avoidHashesSet.has(hash)
      })
      
      console.log('Available fallbacks after filtering:', availableFallbacks.length)
      
      if (availableFallbacks.length === 0) {
        // All fallbacks have been used, reset by using all
        console.log('All fallbacks used, selecting from all')
        const allFallbacks = fallbackCompliments.map(normalizeCompliment)
        try {
          const result = selectComplimentFromCandidates(
            signals,
            userKey,
            env,
            allFallbacks,
            new Set(), // Don't avoid any - user has seen them all
            sessionNonce
          )
          selectedCompliment = {
            complimentText: result.complimentText,
            complimentHash: result.complimentHash,
          }
        } catch (error) {
          console.error('Error selecting from all fallbacks:', error)
          // Pick a random one as last resort
          const randomIndex = Math.floor(Math.random() * allFallbacks.length)
          const randomText = allFallbacks[randomIndex]
          selectedCompliment = {
            complimentText: randomText,
            complimentHash: hashString(randomText),
          }
        }
      } else {
        try {
          const result = selectComplimentFromCandidates(
            signals,
            userKey,
            env,
            availableFallbacks,
            avoidHashesSet,
            sessionNonce
          )
          selectedCompliment = {
            complimentText: result.complimentText,
            complimentHash: result.complimentHash,
          }
          console.log('Selected from fallbacks:', result.complimentText.substring(0, 50))
        } catch (fallbackError) {
          console.error('Fallback selection error:', fallbackError)
          // Pick a random available one as last resort
          const randomIndex = Math.floor(Math.random() * availableFallbacks.length)
          const randomText = availableFallbacks[randomIndex]
          selectedCompliment = {
            complimentText: randomText,
            complimentHash: hashString(randomText),
          }
        }
      }
    }

    if (!selectedCompliment) {
      // This should never happen, but just in case
      console.error('No compliment selected after all attempts')
      const randomIndex = Math.floor(Math.random() * fallbackCompliments.length)
      const randomText = fallbackCompliments[randomIndex]
      selectedCompliment = {
        complimentText: randomText,
        complimentHash: hashString(normalizeCompliment(randomText)),
      }
    }

    console.log('Returning compliment:', {
      hash: selectedCompliment.complimentHash.substring(0, 16) + '...',
      textPreview: selectedCompliment.complimentText.substring(0, 50) + '...',
    })

    return NextResponse.json({
      id: selectedCompliment.complimentHash,
      text: selectedCompliment.complimentText,
    })
  } catch (error) {
    console.error('Error selecting compliment:', error)
    // Return a random fallback instead of always the same one
    const randomIndex = Math.floor(Math.random() * fallbackCompliments.length)
    const randomText = fallbackCompliments[randomIndex]
    return NextResponse.json({
      id: hashString(normalizeCompliment(randomText)),
      text: randomText,
    })
  }
}
