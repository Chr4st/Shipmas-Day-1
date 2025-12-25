// Compliment generator using template composition and continuous weights
// Generates resonant compliments from behavior signals without if-statements

import { SplitMix64, hashToSeed } from './entropy'

// Template atoms
const openers = [
  'You have',
  'There\'s something',
  'I notice',
  'You bring',
  'You hold',
  'You carry',
  'You show',
  'You offer',
  'You create',
  'You find',
  'You make',
  'You keep',
  'You know',
  'You see',
  'You feel',
  'You move',
  'You stay',
  'You choose',
  'You let',
  'You give',
]

const traitStatements = [
  // Calm/patient (high idle)
  'a quiet kind of confidence',
  'a steady presence',
  'a patient way of seeing',
  'a calm kind of precision',
  'a gentle kind of strength',
  'a thoughtful approach',
  'a measured way of moving',
  'a quiet kind of wisdom',
  'a still kind of power',
  'a patient kind of curiosity',
  'a calm kind of focus',
  'a steady kind of grace',
  'a quiet kind of courage',
  'a measured kind of energy',
  'a gentle kind of persistence',
  
  // Exploratory (high movement)
  'a restless curiosity',
  'an exploratory mind',
  'a wandering kind of attention',
  'a searching kind of energy',
  'a curious kind of movement',
  'an adventurous spirit',
  'a wide kind of seeing',
  'a roaming kind of focus',
  'a restless kind of intelligence',
  'an exploratory kind of presence',
  'a wandering kind of wisdom',
  'a searching kind of grace',
  'a curious kind of strength',
  'an adventurous kind of patience',
  'a wide kind of understanding',
  
  // Decisive (high clicks)
  'a decisively playful way',
  'a direct kind of curiosity',
  'a quick kind of learning',
  'a decisive kind of exploration',
  'a sharp kind of attention',
  'a focused kind of energy',
  'a precise kind of movement',
  'a direct kind of presence',
  'a quick kind of understanding',
  'a sharp kind of wisdom',
  'a focused kind of curiosity',
  'a precise kind of exploration',
  'a decisive kind of patience',
  'a direct kind of strength',
  'a quick kind of grace',
  
  // Balanced combinations
  'a thoughtful kind of energy',
  'a measured kind of curiosity',
  'a steady kind of exploration',
  'a calm kind of playfulness',
  'a patient kind of decisiveness',
  'a gentle kind of directness',
  'a quiet kind of action',
  'a still kind of movement',
  'a thoughtful kind of restlessness',
  'a measured kind of adventure',
  'a steady kind of searching',
  'a calm kind of testing',
  'a patient kind of exploring',
  'a gentle kind of wandering',
  'a quiet kind of learning',
  'a still kind of curiosity',
  'a thoughtful kind of play',
  'a measured kind of energy',
  'a steady kind of presence',
  'a calm kind of intelligence',
]

const evidenceLines = [
  // High idle / patience
  'You don\'t rush the moment',
  'You let things settle',
  'You give things room',
  'You wait for the right shape',
  'You let time do its work',
  'You don\'t force the answer',
  'You trust the process',
  'You let things land',
  'You give space to what matters',
  'You don\'t hurry the understanding',
  'You let clarity find you',
  'You wait for things to speak',
  'You give moments their weight',
  'You don\'t rush to conclusions',
  'You let patterns emerge',
  
  // High movement / exploration
  'You explore until you find the shape',
  'You touch the edges to learn',
  'You wander until something clicks',
  'You search until it makes sense',
  'You move until you see the pattern',
  'You explore until the world opens',
  'You test boundaries to understand',
  'You roam until you find your way',
  'You wander until clarity arrives',
  'You explore until things connect',
  'You move until the picture forms',
  'You search until meaning appears',
  'You test until systems speak back',
  'You explore until patterns reveal',
  'You wander until understanding comes',
  
  // High clicks / decisiveness
  'You test things until they speak back',
  'You don\'t just watch, you engage',
  'You negotiate with systems',
  'You interact until you understand',
  'You probe until things respond',
  'You engage until clarity comes',
  'You test until patterns emerge',
  'You interact until meaning forms',
  'You probe until systems reveal',
  'You engage until things connect',
  'You test until understanding arrives',
  'You interact until the picture forms',
  'You probe until clarity appears',
  'You engage until patterns speak',
  'You test until meaning emerges',
  
  // Balanced
  'You find the balance between action and stillness',
  'You know when to move and when to wait',
  'You blend curiosity with patience',
  'You combine exploration with presence',
  'You mix playfulness with thoughtfulness',
  'You balance energy with calm',
  'You weave movement with stillness',
  'You combine testing with waiting',
  'You blend directness with gentleness',
  'You mix decisiveness with patience',
  'You balance exploration with focus',
  'You combine wandering with presence',
  'You blend restlessness with calm',
  'You mix searching with settling',
  'You balance action with observation',
]

const closers = [
  'That\'s rare.',
  'That\'s a gift.',
  'That\'s how builders think.',
  'That\'s how artists see.',
  'That\'s a rare skill.',
  'That matters.',
  'That\'s valuable.',
  'That\'s how wisdom works.',
  'That\'s how understanding grows.',
  'That\'s how presence feels.',
  'That\'s how learning happens.',
  'That\'s how curiosity moves.',
  'That\'s how patience pays.',
  'That\'s how exploration rewards.',
  'That\'s how presence builds.',
]

// Continuous normalization
function smooth01(x: number, k: number): number {
  return 1 - Math.exp(-x / k)
}

// Compute style vector from normalized metrics
function computeStyleVector(
  pixelsMoved: number,
  clicks: number,
  idleMs: number
): { tempo: number; softness: number; spark: number } {
  // Normalize continuously
  const m = smooth01(pixelsMoved, 5000) // exploration energy
  const c = smooth01(clicks, 10) // decisiveness / agency
  const i = smooth01(idleMs, 5000) // patience / presence

  // Derive style vector (all continuous)
  const tempo = 0.6 * c + 0.4 * (1 - i)
  const softness = 0.7 * i + 0.3 * (1 - c)
  const spark = 0.7 * m + 0.3 * c

  return { tempo, softness, spark }
}

// Weighted selection from array
function weightedSelect<T>(
  items: T[],
  weights: number[],
  rng: SplitMix64
): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let random = rng.nextDouble() * totalWeight

  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return items[i]
    }
  }
  return items[items.length - 1]
}

// Generate compliment from templates using style vector
export function generateCompliment(
  keyHex: string,
  pixelsMoved: number,
  clicks: number,
  idleMs: number
): string {
  const seed = hashToSeed(keyHex)
  const rng = new SplitMix64(seed)

  const style = computeStyleVector(pixelsMoved, clicks, idleMs)

  // Select opener (weighted by spark for energy)
  const openerWeights = openers.map(() => 1.0)
  const opener = weightedSelect(openers, openerWeights, rng)

  // Select trait (weighted by style vector)
  const traitWeights = traitStatements.map((_, i) => {
    // High idle -> calm traits (first 15)
    if (i < 15) return 0.5 + style.softness * 1.5
    // High movement -> exploratory traits (next 15)
    if (i < 30) return 0.5 + style.spark * 1.5
    // High clicks -> decisive traits (next 15)
    if (i < 45) return 0.5 + style.tempo * 1.5
    // Balanced traits (rest)
    return 0.5 + (1 - Math.abs(style.tempo - style.softness)) * 1.0
  })
  const trait = weightedSelect(traitStatements, traitWeights, rng)

  // Select evidence (weighted by style)
  const evidenceWeights = evidenceLines.map((_, i) => {
    // High idle -> patience evidence (first 15)
    if (i < 15) return 0.5 + style.softness * 1.5
    // High movement -> exploration evidence (next 15)
    if (i < 30) return 0.5 + style.spark * 1.5
    // High clicks -> decisiveness evidence (next 15)
    if (i < 45) return 0.5 + style.tempo * 1.5
    // Balanced evidence (rest)
    return 0.5 + (1 - Math.abs(style.tempo - style.softness)) * 1.0
  })
  const evidence = weightedSelect(evidenceLines, evidenceWeights, rng)

  // Select closer (weighted by softness for warmth)
  const closerWeights = closers.map(() => 0.8 + style.softness * 0.4)
  const closer = weightedSelect(closers, closerWeights, rng)

  // Compose compliment
  let compliment = `${opener} ${trait}. ${evidence}. ${closer}`

  // Add punctuation variation based on tempo
  if (style.tempo > 0.7) {
    // High tempo: shorter, punchier
    compliment = compliment.replace(/\./g, (match, offset) => {
      if (offset < compliment.length - 1 && rng.nextDouble() > 0.7) {
        return '.'
      }
      return match
    })
  } else if (style.softness > 0.7) {
    // High softness: more pauses
    compliment = compliment.replace(/\. /g, '. ')
  }

  return compliment
}

// Generate behavior reflection (for the subline)
export function generateBehaviorReflection(
  keyHex: string,
  pixelsMoved: number,
  clicks: number,
  idleMs: number
): string {
  const seed = hashToSeed(keyHex)
  const rng = new SplitMix64(seed)

  const style = computeStyleVector(pixelsMoved, clicks, idleMs)

  const reflections = [
    // High idle
    'Opened slowly.',
    'Unwrapped with patience.',
    'Opened with stillness.',
    'Unwrapped carefully.',
    'Opened with presence.',
    'Unwrapped gently.',
    
    // High movement
    'Unwrapped with curiosity.',
    'Opened while exploring.',
    'Unwrapped with wonder.',
    'Opened while moving.',
    'Unwrapped with restlessness.',
    'Opened while searching.',
    
    // High clicks
    'Opened all at once.',
    'Unwrapped decisively.',
    'Opened with anticipation.',
    'Unwrapped quickly.',
    'Opened with eagerness.',
    'Unwrapped directly.',
    
    // Balanced
    'Opened just now.',
    'Unwrapped with intention.',
    'Opened with care.',
    'Unwrapped thoughtfully.',
    'Opened with presence.',
    'Unwrapped with attention.',
  ]

  const weights = reflections.map((_, i) => {
    if (i < 6) return 0.5 + style.softness * 1.5 // patience
    if (i < 12) return 0.5 + style.spark * 1.5 // exploration
    if (i < 18) return 0.5 + style.tempo * 1.5 // decisiveness
    return 0.5 + (1 - Math.abs(style.tempo - style.softness)) * 1.0 // balanced
  })

  return weightedSelect(reflections, weights, rng)
}

