# Shipmas Day 1

A gift-wrapped loading experience with personalized compliments powered by an entropy-based selection algorithm.

## Features

- Full-screen Three.js loading animation that responds to user interactions
- Entropy-based compliment selection using continuous normalization (no bucket-based logic)
- Client-side deduplication via localStorage to ensure unique compliments per user
- Premium reveal animation with smooth transitions
- Accessibility support for reduced motion preferences
- Compliments sourced from public API with embedded fallback

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **Three.js** for WebGL animations
- **Public Compliments API** (https://compliments-api.vercel.app/random)
- **Vercel-ready** deployment configuration (no database required)

## Local Development

### Prerequisites

- Node.js 18+ and npm
- No database setup required

### Setup Steps

1. **Install dependencies:**

```bash
npm install
```

2. **Run the development server:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

That is it. No database configuration needed.

## How It Works

### Loading Phase

During the 8-12 second loading phase, the app tracks three user signals:

1. **totalPixelsMoved**: Sum of mouse movement distances
2. **totalClicks**: Number of clicks
3. **totalIdleTimeMs**: Time with no interaction

The Three.js animation responds to these signals:
- Movement increases turbulence and swirl in the particle system
- Clicks create ripple burst effects
- Idle time increases crystallization (particles settle into a ring/torus formation)

### Entropy Algorithm

The selection algorithm uses continuous normalization (no if-statements):

1. Normalizes each signal using `smooth01(x, k) = 1 - exp(-x/k)`
2. Builds a fingerprint string with:
   - Normalized values (10 decimal precision)
   - Raw totals
   - Environment data (viewport, DPR, timezone)
   - User key (stable anonymous ID)
3. Hashes the fingerprint using SHA-256
4. Seeds a deterministic PRNG (SplitMix64) from the hash
5. Fetches a batch of compliments from the public API
6. Selects a compliment deterministically from the batch using the seeded PRNG
7. Enforces deduplication via avoidHashes (skips already-seen compliments)

### Deduplication

- **Client-side**: Uses localStorage to track seen compliment hashes (SHA-256 of text)
- **Request payload**: Sends last 200 seen hashes as `avoidHashes` to server
- **Server-side**: Filters out avoided hashes before selection
- If all candidates in a batch are avoided, fetches another batch (up to 3 rounds)
- Falls back to embedded compliment list if API fails
- Ensures no repeats for the same user until exhaustion

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Deploy (no environment variables required)

The app is configured for Vercel deployment and requires zero configuration.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── compliment/
│   │       └── route.ts          # API endpoint for compliment selection
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page component
├── components/
│   └── LoadingGift.tsx          # Three.js loading animation
├── lib/
│   ├── entropy.ts                # Entropy algorithm implementation
│   ├── fetchPool.ts              # Concurrency-limited API fetching
│   └── fallbackCompliments.ts   # Embedded fallback compliments
└── README.md
```

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

## Notes

- The loading duration is 10 seconds (4 seconds with reduced motion)
- Compliments are selected deterministically based on user interaction patterns
- The app gracefully handles API failures with embedded fallback compliments
- Three.js performance is optimized with InstancedMesh and capped DPR at 2
- No database required: all compliments come from the public API or embedded fallback
- Deduplication works across sessions via localStorage (capped at 1000 hashes)
