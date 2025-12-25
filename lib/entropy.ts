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
class SplitMix64 {
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
function hashFingerprint(fingerprint: string): string {
  return crypto.createHash('sha256').update(fingerprint).digest('hex')
}

// Convert hash to seed (first 16 hex chars = 64 bits)
function hashToSeed(hash: string): bigint {
  return BigInt('0x' + hash.substring(0, 16))
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

// Client-side helper to track issued compliments
export function getIssuedComplimentIds(): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const STORAGE_KEY = 'shipmas_issued_ids'
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function addIssuedComplimentId(id: string): void {
  if (typeof window === 'undefined') {
    return
  }

  const STORAGE_KEY = 'shipmas_issued_ids'
  const current = getIssuedComplimentIds()
  if (!current.includes(id)) {
    current.push(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  }
}

