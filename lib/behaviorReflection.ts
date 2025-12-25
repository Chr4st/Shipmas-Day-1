// Generate behavior reflection text based on user signals
// Never explains the algorithm - only reflects how the gift was opened

export function generateBehaviorReflection(signals: {
  pixelsMoved: number
  clicks: number
  idleMs: number
}): string {
  const { pixelsMoved, clicks, idleMs } = signals

  // Normalize values for decision making
  const movementLevel = pixelsMoved / 5000 // ~5k = high movement
  const clickLevel = clicks / 10 // ~10 clicks = high clicks
  const idleLevel = idleMs / 5000 // ~5s = high idle

  // Determine primary behavior pattern
  const patterns: string[] = []

  // Movement patterns
  if (movementLevel > 0.7) {
    patterns.push('explored')
  } else if (movementLevel > 0.3) {
    patterns.push('wandered')
  } else if (movementLevel < 0.1) {
    patterns.push('still')
  }

  // Click patterns
  if (clickLevel > 0.8) {
    patterns.push('eager')
  } else if (clickLevel > 0.4) {
    patterns.push('curious')
  } else if (clickLevel < 0.1 && clicks === 0) {
    patterns.push('patient')
  }

  // Idle patterns
  if (idleLevel > 0.6) {
    patterns.push('slowly')
  } else if (idleLevel > 0.3) {
    patterns.push('carefully')
  } else if (idleLevel < 0.1) {
    patterns.push('quickly')
  }

  // Generate reflection based on combination
  if (patterns.includes('still') && patterns.includes('patient')) {
    return 'Opened with stillness.'
  }
  if (patterns.includes('explored') && patterns.includes('eager')) {
    return 'Unwrapped with curiosity.'
  }
  if (patterns.includes('slowly') && patterns.includes('carefully')) {
    return 'Wrapped slowly.'
  }
  if (patterns.includes('quickly') && patterns.includes('eager')) {
    return 'Opened all at once.'
  }
  if (patterns.includes('wandered') && patterns.includes('curious')) {
    return 'Unwrapped with wonder.'
  }
  if (patterns.includes('patient') && !patterns.includes('eager')) {
    return 'You did not rush this.'
  }
  if (patterns.includes('still') && patterns.includes('carefully')) {
    return 'Opened with intention.'
  }
  if (patterns.includes('explored') && patterns.includes('slowly')) {
    return 'Unwrapped gradually.'
  }

  // Default fallbacks
  if (idleLevel > movementLevel && idleLevel > clickLevel) {
    return 'Opened with patience.'
  }
  if (clickLevel > movementLevel && clickLevel > idleLevel) {
    return 'Unwrapped with anticipation.'
  }
  if (movementLevel > clickLevel && movementLevel > idleLevel) {
    return 'Opened while moving.'
  }

  return 'Opened just now.'
}

