// API endpoint for compliment generation
// Uses stable entropy key + template composition for resonant, unique compliments
// No external API dependency - generates from templates using continuous weights

import { NextRequest, NextResponse } from 'next/server'
import {
  type UserSignals,
  type EnvData,
  computeEntropyKey,
} from '@/lib/entropy'
import {
  generateCompliment,
  generateBehaviorReflection,
} from '@/lib/complimentGenerator'
import crypto from 'crypto'

// Hash a string using SHA-256
function hashString(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
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

    // Generate a session nonce for "Try again" uniqueness
    const sessionNonce = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    // 1. Compute stable entropy key
    const entropyKey = computeEntropyKey(signals, userKey, env, sessionNonce)

    // 2. Generate compliment from templates (deterministic from key)
    let complimentText: string
    let complimentHash: string
    let attempts = 0
    const maxAttempts = 10

    // Ensure uniqueness: if generated compliment is in avoidHashes, regenerate with different nonce
    do {
      const currentNonce = attempts > 0 
        ? `${sessionNonce}-retry-${attempts}`
        : sessionNonce
      
      const currentKey = computeEntropyKey(signals, userKey, env, currentNonce)
      complimentText = generateCompliment(
        currentKey,
        clampedPixelsMoved,
        clampedClicks,
        clampedIdleMs
      )
      complimentHash = hashString(complimentText)
      attempts++
    } while (avoidHashes.includes(complimentHash) && attempts < maxAttempts)

    // If still collided after max attempts, use a different approach
    if (avoidHashes.includes(complimentHash) && attempts >= maxAttempts) {
      // Add extra entropy to force different generation
      const fallbackNonce = `${sessionNonce}-fallback-${Date.now()}`
      const fallbackKey = computeEntropyKey(signals, userKey, env, fallbackNonce)
      complimentText = generateCompliment(
        fallbackKey,
        clampedPixelsMoved + Math.random() * 0.1, // Tiny variation
        clampedClicks,
        clampedIdleMs
      )
      complimentHash = hashString(complimentText)
    }

    // Generate behavior reflection
    const behaviorReflection = generateBehaviorReflection(
      entropyKey,
      clampedPixelsMoved,
      clampedClicks,
      clampedIdleMs
    )

    console.log('Generated compliment:', {
      hash: complimentHash.substring(0, 16) + '...',
      textPreview: complimentText.substring(0, 50) + '...',
      reflection: behaviorReflection,
    })

    return NextResponse.json({
      id: complimentHash,
      text: complimentText,
      reflection: behaviorReflection, // Include behavior reflection
    })
  } catch (error) {
    console.error('Error generating compliment:', error)
    // Fallback: generate a simple compliment
    const fallbackKey = computeEntropyKey(
      { pixelsMoved: 0, clicks: 0, idleMs: 0 },
      'fallback',
      { w: 1920, h: 1080, dpr: 1, tzOffset: 0 },
      Date.now().toString()
    )
    const fallbackText = generateCompliment(fallbackKey, 0, 0, 0)
    return NextResponse.json({
      id: hashString(fallbackText),
      text: fallbackText,
      reflection: 'Opened just now.',
    })
  }
}
