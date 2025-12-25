// API endpoint for compliment selection
// Validates inputs, computes entropy-based selection, enforces dedupe

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { selectCompliment, type UserSignals, type EnvData } from '@/lib/entropy'

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
    }: {
      pixelsMoved: number
      clicks: number
      idleMs: number
      userKey: string
      env: EnvData
    } = body

    if (
      typeof pixelsMoved !== 'number' ||
      typeof clicks !== 'number' ||
      typeof idleMs !== 'number' ||
      typeof userKey !== 'string' ||
      !env ||
      typeof env.w !== 'number' ||
      typeof env.h !== 'number' ||
      typeof env.dpr !== 'number' ||
      typeof env.tzOffset !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Get all compliments
    const allCompliments = await db.compliment.findMany({
      select: { id: true },
    })
    const availableIds = allCompliments.map((c) => c.id)

    if (availableIds.length === 0) {
      return NextResponse.json(
        { error: 'No compliments available' },
        { status: 500 }
      )
    }

    // Get already issued compliments for this user
    const issued = await db.issued.findMany({
      where: { userKey },
      select: { complimentId: true },
    })
    const alreadyIssuedIds = new Set(issued.map((i) => i.complimentId))

    // Select compliment using entropy algorithm
    const signals: UserSignals = { pixelsMoved, clicks, idleMs }
    const { complimentId, fingerprintHash } = await selectCompliment(
      signals,
      userKey,
      env,
      availableIds,
      alreadyIssuedIds
    )

    // Get the compliment text
    const compliment = await db.compliment.findUnique({
      where: { id: complimentId },
      select: { id: true, text: true },
    })

    if (!compliment) {
      return NextResponse.json(
        { error: 'Compliment not found' },
        { status: 500 }
      )
    }

    // Record issuance atomically (using transaction if possible)
    await db.issued.create({
      data: {
        userKey,
        complimentId: compliment.id,
        fingerprintHash,
      },
    })

    return NextResponse.json({
      id: compliment.id,
      text: compliment.text,
    })
  } catch (error) {
    console.error('Error selecting compliment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

