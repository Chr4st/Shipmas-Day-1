# Shipmas Day 1

A gift-wrapped loading experience with personalized compliments powered by an entropy-based selection algorithm.

## Features

- Full-screen Three.js loading animation that responds to user interactions
- Entropy-based compliment selection using continuous normalization (no bucket-based logic)
- Client and server-side deduplication to ensure unique compliments per user
- Premium reveal animation with smooth transitions
- Accessibility support for reduced motion preferences
- Database-backed with 300+ high-quality compliments

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **Three.js** for WebGL animations
- **Prisma** with **Supabase Postgres** for database
- **Vercel-ready** deployment configuration

## Local Development

### Prerequisites

- Node.js 18+ and npm
- A Supabase account (free tier works) or Neon Postgres database

### Setup Steps

1. **Install dependencies:**

```bash
npm install
```

2. **Set up your database:**

   - Create a new Supabase project at https://supabase.com
   - Go to Settings > Database and copy your connection string
   - Or set up a Neon Postgres database at https://neon.tech

3. **Configure environment variables:**

   Create a `.env` file in the root directory:

```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

   Replace with your actual database connection string.

4. **Set up the database schema:**

```bash
npm run db:generate
npm run db:push
```

   This will create the `compliments` and `issued` tables in your database.

5. **Seed the database with compliments:**

```bash
npm run db:seed
```

   This will generate and insert 300+ unique compliments into your database.

6. **Run the development server:**

```bash
npm run dev
```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

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
5. Selects a compliment deterministically from available candidates
6. Enforces deduplication (skips already-issued compliments)

### Deduplication

- **Client-side**: Uses localStorage to track issued compliment IDs
- **Server-side**: Uses the `issued` table keyed by anonymous `user_key`
- Both work together to ensure no repeats across sessions

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your `DATABASE_URL` environment variable
4. Deploy

The app is configured for Vercel deployment.

### Database Setup

Make sure to run migrations and seed before deploying:

```bash
npm run db:push
npm run db:seed
```

Or set up a migration workflow if using Prisma migrations in production.

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
│   ├── db.ts                     # Prisma client
│   └── entropy.ts                # Entropy algorithm implementation
├── prisma/
│   └── schema.prisma             # Database schema
├── scripts/
│   └── seed.ts                   # Database seeding script
└── README.md
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required)

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run db:generate`: Generate Prisma client
- `npm run db:push`: Push schema to database
- `npm run db:seed`: Seed database with compliments

## Notes

- The loading duration is 10 seconds (4 seconds with reduced motion)
- Compliments are selected deterministically based on user interaction patterns
- The app gracefully handles API failures with fallback compliments
- Three.js performance is optimized with InstancedMesh and capped DPR at 2

