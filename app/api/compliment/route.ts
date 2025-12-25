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
  const response = await fetch('https://compliments-api.vercel.app/random', {
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`)
  }

  const data = await response.json()
  // Handle different possible response formats
  const text = data.compliment || data.text || data.message || ''
  return text.trim()
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

    // Try fetching from public API (up to 3 rounds)
    let selectedCompliment: { complimentText: string; complimentHash: string } | null = null
    let rounds = 0
    const maxRounds = 3
    const batchSize = 18
    const concurrency = 5

    while (!selectedCompliment && rounds < maxRounds) {
      rounds++

      try {
        // Fetch batch of compliments
        const fetchedTexts = await fetchPool(
          'https://compliments-api.vercel.app/random',
          batchSize,
          concurrency,
          fetchCompliment
        )

        if (fetchedTexts.length === 0) {
          continue // Try next round
        }

        // Normalize and dedupe within batch
        const normalized = fetchedTexts
          .map(normalizeCompliment)
          .filter((text) => text.length > 0)

        if (normalized.length === 0) {
          continue // Try next round
        }

        // Try to select from this batch
        try {
          const result = selectComplimentFromCandidates(
            signals,
            userKey,
            env,
            normalized,
            avoidHashesSet
          )

          // Check if the selected compliment is in avoidHashes
          if (!avoidHashesSet.has(result.complimentHash)) {
            selectedCompliment = {
              complimentText: result.complimentText,
              complimentHash: result.complimentHash,
            }
            break
          }
        } catch (selectError) {
          // Selection failed, try next round
          continue
        }
      } catch (fetchError) {
        // Fetch failed, try next round or fallback
        console.error('Error fetching compliments:', fetchError)
        continue
      }
    }

    // Fallback to embedded list if API failed or all were avoided
    if (!selectedCompliment) {
      try {
        const result = selectComplimentFromCandidates(
          signals,
          userKey,
          env,
          fallbackCompliments,
          avoidHashesSet
        )
        selectedCompliment = {
          complimentText: result.complimentText,
          complimentHash: result.complimentHash,
        }
      } catch (fallbackError) {
        // Even fallback failed, return a default
        const defaultText =
          'You are doing great, and your persistence is admirable.'
        selectedCompliment = {
          complimentText: defaultText,
          complimentHash: hashString(defaultText),
        }
      }
    }

    return NextResponse.json({
      id: selectedCompliment.complimentHash,
      text: selectedCompliment.complimentText,
    })
  } catch (error) {
    console.error('Error selecting compliment:', error)
    // Return a safe fallback
    const fallbackText = 'You are doing great, and your persistence is admirable.'
    return NextResponse.json({
      id: hashString(fallbackText),
      text: fallbackText,
    })
  }
}
