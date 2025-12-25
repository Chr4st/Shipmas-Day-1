// Entropy-based compliment selection algorithm
// Uses continuous normalization, fingerprinting, and deterministic PRNG
// No bucket-based if-statements; all selection is continuous and deterministic

import crypto from 'crypto'

// Continuous normalization function: smooth01(x, k) = 1 - exp(-x/k)
// Preserves fine-grained differences and maps to [0, 1)
export function smooth01(x: number, k: number): number {
  if (k <= 0) return x > 0 ? 1 : 0
  return 1 - Math.exp(-x / k)
}

// Environment data for fingerprinting
export interface EnvData {
  w: number // viewport width
  h: number // viewport height
  dpr: number // device pixel ratio
  tzOffset: number // timezone offset in minutes
}

// User interaction signals
export interface UserSignals {
  pixelsMoved: number
  clicks: number
  idleMs: number
}

// Deterministic PRNG using SplitMix64
// Seed is a 64-bit integer derived from hash
export class SplitMix64 {
  private state: bigint

  constructor(seed: bigint) {
    this.state = seed
  }

  next(): number {
    // SplitMix64 algorithm
    this.state = (this.state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn
    let z = this.state
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn
    z = (z ^ (z >> 31n)) & 0xffffffffffffffffn
    // Convert to [0, 1) range
    return Number(z) / 0x100000000
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }

  nextDouble(): number {
    return this.next()
  }
}

// Build fingerprint string from all inputs
function buildFingerprint(
  signals: UserSignals,
  userKey: string,
  env: EnvData,
  sessionNonce?: string
): string {
  // Normalize signals with different k values to preserve granularity
  const normMovement = smooth01(signals.pixelsMoved, 5000) // ~5k pixels = ~0.63
  const normClicks = smooth01(signals.clicks, 10) // ~10 clicks = ~0.63
  const normIdle = smooth01(signals.idleMs, 3000) // ~3s idle = ~0.63

  // High precision decimals (10 decimals)
  const parts = [
    `m:${normMovement.toFixed(10)}`,
    `c:${normClicks.toFixed(10)}`,
    `i:${normIdle.toFixed(10)}`,
    `rawM:${signals.pixelsMoved}`,
    `rawC:${signals.clicks}`,
    `rawI:${signals.idleMs}`,
    `env:${env.w}x${env.h}:${env.dpr}:${env.tzOffset}`,
    `user:${userKey}`,
  ]

  if (sessionNonce) {
    parts.push(`nonce:${sessionNonce}`)
  }

  return parts.join('|')
}

// Hash fingerprint using SHA-256
export function hashFingerprint(fingerprint: string): string {
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

// Convert hash to seed (first 16 hex chars = 64 bits)
export function hashToSeed(hash: string): bigint {
  return BigInt('0x' + hash.substring(0, 16))
}

// Build fingerprint and return hash (for external use)
export function computeEntropyKey(
  signals: UserSignals,
  userKey: string,
  env: EnvData,
  sessionNonce?: string
): string {
  const fingerprint = buildFingerprint(signals, userKey, env, sessionNonce)
  return hashFingerprint(fingerprint)
}

// Select compliment using deterministic PRNG
// Returns the compliment ID and text
export async function selectCompliment(
  signals: UserSignals,
  userKey: string,
  env: EnvData,
  availableComplimentIds: string[],
  alreadyIssuedIds: Set<string>,
  sessionNonce?: string
): Promise<{ complimentId: string; fingerprintHash: string }> {
  if (availableComplimentIds.length === 0) {
    throw new Error('No compliments available')
  }

  // Build fingerprint and hash
  const fingerprint = buildFingerprint(signals, userKey, env, sessionNonce)
  const hash = hashFingerprint(fingerprint)
  const seed = hashToSeed(hash)

  // Create PRNG from seed
  const rng = new SplitMix64(seed)

  // Filter out already issued compliments
  const candidateIds = availableComplimentIds.filter(
    (id) => !alreadyIssuedIds.has(id)
  )

  if (candidateIds.length === 0) {
    // All compliments have been issued, reset by selecting from all
    // In practice, you might want to handle this differently
    const fallbackIndex = rng.nextInt(availableComplimentIds.length)
    return {
      complimentId: availableComplimentIds[fallbackIndex],
      fingerprintHash: hash,
    }
  }

  // Select deterministically from candidates
  const selectedIndex = rng.nextInt(candidateIds.length)
  const complimentId = candidateIds[selectedIndex]

  return {
    complimentId,
    fingerprintHash: hash,
  }
}

// Client-side helper to get or create user key
export function getUserKey(): string {
  if (typeof window === 'undefined') {
    return 'server-user'
  }

  const STORAGE_KEY = 'shipmas_user_key'
  let userKey = localStorage.getItem(STORAGE_KEY)

  if (!userKey) {
    // Generate UUID v4
    userKey = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }
    )
    localStorage.setItem(STORAGE_KEY, userKey)
  }

  return userKey
}

// Client-side helper to track issued compliments (by hash)
export function getSeenComplimentHashes(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const STORAGE_KEY = 'shipmas_seen_hashes'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function addSeenComplimentHash(hash: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const STORAGE_KEY = 'shipmas_seen_hashes'
  const current = getSeenComplimentHashes()
  if (!current.includes(hash)) {
    current.push(hash)
    // Cap at 1000 to prevent localStorage bloat
    if (current.length > 1000) {
      current.shift()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  }
}

// Get last N hashes for avoidHashes payload (keep payload small)
export function getAvoidHashes(limit: number = 200): string[] {
  const all = getSeenComplimentHashes()
  return all.slice(-limit)
}

// Legacy functions for backward compatibility (now use hash-based)
export function getIssuedComplimentIds(): string[] {
  return getSeenComplimentHashes()
}

export function addIssuedComplimentId(id: string): void {
  addSeenComplimentHash(id)
}

// Select from candidate compliments using deterministic PRNG
// Returns the selected compliment text and its hash
export function selectComplimentFromCandidates(
  signals: UserSignals,
  userKey: string,
  env: EnvData,
  candidates: string[],
  avoidHashes: Set<string>,
  sessionNonce?: string
): { complimentText: string; complimentHash: string; fingerprintHash: string } {
  if (candidates.length === 0) {
    throw new Error('No compliments available')
  }

  // Build fingerprint and hash
  const fingerprint = buildFingerprint(signals, userKey, env, sessionNonce)
  const hash = hashFingerprint(fingerprint)
  const seed = hashToSeed(hash)

  // Create PRNG from seed
  const rng = new SplitMix64(seed)

  // Hash each candidate and filter out avoided ones
  const candidateHashes = candidates.map((text) => {
    const normalized = text.trim().replace(/\s+/g, ' ')
    return {
      text: normalized,
      hash: hashFingerprint(normalized),
    }
  })

  // Filter out duplicates within batch and avoided hashes
  const seenInBatch = new Set<string>()
  const validCandidates = candidateHashes.filter((c) => {
    if (seenInBatch.has(c.hash) || avoidHashes.has(c.hash)) {
      return false
    }
    seenInBatch.add(c.hash)
    return true
  })

  if (validCandidates.length === 0) {
    // All candidates are avoided, try advancing PRNG multiple times
    // to find one that's not avoided (up to candidates.length attempts)
    let attempts = 0
    const maxAttempts = Math.min(candidates.length, 50)
    
    while (attempts < maxAttempts) {
      const candidateIndex = rng.nextInt(candidates.length)
      const candidateText = candidates[candidateIndex].trim().replace(/\s+/g, ' ')
      const candidateHash = hashFingerprint(candidateText)
      
      if (!avoidHashes.has(candidateHash)) {
        return {
          complimentText: candidateText,
          complimentHash: candidateHash,
          fingerprintHash: hash,
        }
      }
      attempts++
    }
    
    // If still no valid candidate after max attempts, return the first one anyway
    // (This should rarely happen if avoidHashes is reasonable)
    const fallbackText = candidates[0].trim().replace(/\s+/g, ' ')
    return {
      complimentText: fallbackText,
      complimentHash: hashFingerprint(fallbackText),
      fingerprintHash: hash,
    }
  }

  // Select deterministically from valid candidates
  const selectedIndex = rng.nextInt(validCandidates.length)
  const selected = validCandidates[selectedIndex]

  return {
    complimentText: selected.text,
    complimentHash: selected.hash,
    fingerprintHash: hash,
  }
}

