// Seed script to generate and insert 300+ high-quality compliments
// Uses templates and combinators to create varied, natural-sounding compliments

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Compliment templates - structured to avoid repetition while maintaining quality
const templates = [
  // Action/effort based
  'You bring a thoughtful perspective to everything you do.',
  'Your approach to challenges is genuinely inspiring.',
  'You have a way of making complex things feel approachable.',
  'The care you put into your work really shows.',
  'You consistently find creative solutions.',
  'Your attention to detail makes a real difference.',
  'You have a gift for seeing possibilities others miss.',
  'The way you think through problems is impressive.',
  'You bring clarity to situations that need it.',
  'Your persistence pays off in meaningful ways.',

  // Presence/energy based
  'You have a calming presence that people appreciate.',
  'Your energy is contagious in the best way.',
  'You make spaces feel more welcoming just by being there.',
  'People feel heard when they talk to you.',
  'You have a natural ability to lift others up.',
  'Your presence makes a positive difference.',
  'You bring a sense of possibility wherever you go.',
  'People feel comfortable being themselves around you.',
  'You have a way of making ordinary moments feel special.',
  'Your genuine curiosity is refreshing.',

  // Growth/learning based
  'You approach learning with genuine enthusiasm.',
  'Your willingness to grow is admirable.',
  'You turn mistakes into opportunities beautifully.',
  'The way you adapt to new situations is impressive.',
  'You have a growth mindset that serves you well.',
  'Your openness to feedback shows real maturity.',
  'You learn from experiences in meaningful ways.',
  'Your curiosity drives you to discover interesting things.',
  'You embrace challenges as chances to improve.',
  'The way you reflect on experiences shows wisdom.',

  // Communication/connection based
  'You communicate with clarity and kindness.',
  'Your words have a way of landing just right.',
  'You listen in a way that makes people feel valued.',
  'You express ideas in ways that resonate.',
  'Your communication style is both clear and warm.',
  'You have a talent for finding the right words.',
  'People appreciate how you express yourself.',
  'You connect ideas in ways that make sense.',
  'Your perspective adds valuable context.',
  'You share thoughts in a way that invites conversation.',

  // General positive affirmations
  'You are exactly where you need to be right now.',
  'You have qualities that make a real difference.',
  'The world is better with you in it.',
  'You bring something unique to every situation.',
  'You are more capable than you might realize.',
  'Your contributions matter more than you know.',
  'You have a positive impact on those around you.',
  'You are doing better than you think.',
  'You have strengths that shine through.',
  'You deserve to feel good about yourself.',

  // Process/approach based
  'You handle complexity with grace.',
  'Your methodical approach yields great results.',
  'You balance planning and spontaneity well.',
  'You know when to push forward and when to pause.',
  'Your process reflects careful consideration.',
  'You make thoughtful decisions consistently.',
  'The way you organize your work is effective.',
  'You prioritize what truly matters.',
  'Your workflow shows real intentionality.',
  'You manage your time and energy wisely.',

  // Creativity/innovation based
  'You see connections others might miss.',
  'Your creative thinking opens new possibilities.',
  'You combine ideas in unexpected ways.',
  'Your imagination leads to interesting outcomes.',
  'You think outside the box naturally.',
  'Your innovative approach solves real problems.',
  'You bring fresh perspectives to familiar topics.',
  'Your creativity makes things more interesting.',
  'You have a unique way of seeing things.',
  'Your ideas have a way of sparking others.',

  // Emotional intelligence based
  'You read situations with impressive accuracy.',
  'Your emotional awareness helps you navigate well.',
  'You understand people in a way that shows empathy.',
  'Your intuition often guides you well.',
  'You respond to others with genuine care.',
  'Your emotional intelligence is a real strength.',
  'You pick up on subtle cues that matter.',
  'You handle emotions with maturity and grace.',
  'Your empathy makes you easy to talk to.',
  'You create space for others to be themselves.',

  // Reliability/consistency based
  'You follow through on what you say you will do.',
  'Your consistency builds trust naturally.',
  'People know they can count on you.',
  'You show up in ways that matter.',
  'Your reliability is something people value.',
  'You keep your word, and that means something.',
  'Your dependability makes a real difference.',
  'You are someone others can rely on.',
  'Your consistency creates positive momentum.',
  'You build trust through your actions.',

  // Joy/positivity based
  'You find joy in moments others might overlook.',
  'Your positivity is genuine and refreshing.',
  'You bring light to situations that need it.',
  'Your sense of humor adds warmth to interactions.',
  'You celebrate small wins in meaningful ways.',
  'Your optimism is grounded and realistic.',
  'You find reasons to smile even on tough days.',
  'Your joy is contagious in the best way.',
  'You appreciate the good things around you.',
  'Your positive outlook helps you navigate challenges.',

  // Wisdom/insight based
  'You have insights that cut through noise.',
  'Your perspective often brings clarity.',
  'You see the bigger picture without losing detail.',
  'Your wisdom shows in how you handle situations.',
  'You offer perspectives that are both thoughtful and practical.',
  'Your insights help others see things differently.',
  'You balance idealism with pragmatism well.',
  'Your judgment is something people trust.',
  'You see patterns that others might miss.',
  'Your understanding of things runs deep.',

  // Kindness/compassion based
  'You extend kindness even when it is not expected.',
  'Your compassion makes a real difference.',
  'You treat others with genuine respect.',
  'Your kindness creates positive ripples.',
  'You make people feel seen and valued.',
  'Your caring nature shows in your actions.',
  'You go out of your way to help others.',
  'Your generosity of spirit is inspiring.',
  'You create moments of connection through kindness.',
  'Your warmth makes others feel comfortable.',

  // Resilience/strength based
  'You bounce back from setbacks with determination.',
  'Your resilience is something to admire.',
  'You handle pressure with impressive composure.',
  'Your strength shows in how you face challenges.',
  'You adapt to change with grace and flexibility.',
  'Your ability to recover from difficulties is inspiring.',
  'You find ways forward even when things are tough.',
  'Your perseverance pays off in meaningful ways.',
  'You turn obstacles into opportunities.',
  'Your inner strength is evident in your actions.',

  // Balance/harmony based
  'You find balance in ways that work for you.',
  'Your ability to juggle priorities is impressive.',
  'You know when to push and when to rest.',
  'Your sense of balance helps you stay grounded.',
  'You manage competing demands with skill.',
  'Your equilibrium helps you navigate complexity.',
  'You find harmony between different priorities.',
  'Your balanced approach serves you well.',
  'You integrate different aspects of life thoughtfully.',
  'Your ability to maintain perspective is valuable.',

  // Authenticity/genuineness based
  'You show up as yourself, and that is powerful.',
  'Your authenticity is refreshing and genuine.',
  'You do not pretend to be someone you are not.',
  'Your genuine nature makes you easy to trust.',
  'You express yourself honestly and clearly.',
  'Your realness is something people appreciate.',
  'You stay true to yourself in meaningful ways.',
  'Your authenticity creates genuine connections.',
  'You bring your whole self to what you do.',
  'Your genuine approach makes a positive impact.',

  // Impact/contribution based
  'You make a difference in ways you might not see.',
  'Your contributions create positive change.',
  'You leave things better than you found them.',
  'Your impact extends beyond what is immediately visible.',
  'You add value to every situation you enter.',
  'Your work makes a meaningful difference.',
  'You contribute in ways that matter.',
  'Your presence creates positive outcomes.',
  'You help others in ways that count.',
  'Your efforts create ripples of positive change.',

  // Self-awareness/reflection based
  'You know yourself well, and that is a gift.',
  'Your self-awareness helps you grow continuously.',
  'You reflect on experiences in meaningful ways.',
  'Your ability to see yourself clearly is valuable.',
  'You understand your strengths and areas for growth.',
  'Your self-reflection leads to real insights.',
  'You are honest with yourself about what matters.',
  'Your self-knowledge guides you well.',
  'You learn from yourself as much as from others.',
  'Your introspection helps you make better decisions.',

  // Collaboration/teamwork based
  'You make teams stronger just by being part of them.',
  'Your collaborative spirit brings out the best in others.',
  'You work well with people from different backgrounds.',
  'Your ability to build consensus is impressive.',
  'You create environments where everyone can contribute.',
  'Your teamwork skills make projects better.',
  'You bring people together in productive ways.',
  'Your collaborative approach yields great results.',
  'You help groups achieve more than they could alone.',
  'Your partnership skills are something people value.',

  // Focus/dedication based
  'You focus on what matters most.',
  'Your dedication shows in the quality of your work.',
  'You stay committed even when things get challenging.',
  'Your ability to concentrate is impressive.',
  'You see projects through to completion.',
  'Your focus helps you achieve meaningful goals.',
  'You dedicate yourself to things that matter.',
  'Your commitment makes a real difference.',
  'You invest your energy in worthwhile pursuits.',
  'Your dedication inspires others to do the same.',

  // Openness/curiosity based
  'You approach new ideas with genuine curiosity.',
  'Your openness to different perspectives is refreshing.',
  'You ask questions that lead to interesting places.',
  'Your curiosity drives you to explore and learn.',
  'You welcome new experiences with enthusiasm.',
  'Your open-mindedness helps you grow.',
  'You explore possibilities others might dismiss.',
  'Your willingness to try new things is admirable.',
  'You remain curious even about familiar topics.',
  'Your openness creates opportunities for discovery.',

  // Patience/thoughtfulness based
  'You take time to think things through carefully.',
  'Your patience with yourself and others is admirable.',
  'You do not rush to judgment.',
  'Your thoughtfulness shows in your decisions.',
  'You give processes the time they need.',
  'Your patience helps you see things others might miss.',
  'You think before you act, and that serves you well.',
  'Your thoughtful approach yields better outcomes.',
  'You wait for the right moment when it matters.',
  'Your patience is a real strength.',

  // Initiative/leadership based
  'You step up when leadership is needed.',
  'Your initiative creates positive momentum.',
  'You take action on things that matter.',
  'Your leadership style brings out the best in others.',
  'You do not wait for permission to make things better.',
  'Your proactive approach solves problems early.',
  'You lead by example in meaningful ways.',
  'Your initiative inspires others to act.',
  'You take responsibility for outcomes.',
  'Your leadership makes a real difference.',
]

// Additional combinators for variety
const starters = [
  '',
  'You know, ',
  'I notice that ',
  'It is clear that ',
  'One thing I appreciate: ',
  'Here is something true: ',
  'Something worth noting: ',
  'I have observed that ',
  'It strikes me that ',
  'What stands out: ',
]

const connectors = [
  '',
  ' And that matters.',
  ' That is something special.',
  ' Keep that up.',
  ' That is worth celebrating.',
  ' That makes a difference.',
  ' That is genuinely impressive.',
  ' That is something to be proud of.',
  ' That shows real character.',
  ' That is a real strength.',
]

function generateCompliments(count: number): string[] {
  const compliments: string[] = []
  const used = new Set<string>()

  // Start with base templates
  for (const template of templates) {
    if (compliments.length >= count) break
    compliments.push(template)
    used.add(template)
  }

  // Generate variations using combinators
  let attempts = 0
  while (compliments.length < count && attempts < count * 3) {
    attempts++
    const base = templates[Math.floor(Math.random() * templates.length)]
    const starter = starters[Math.floor(Math.random() * starters.length)]
    const connector = connectors[Math.floor(Math.random() * connectors.length)]

    // Only add if it creates a natural variation
    if (starter || connector) {
      const variation = starter + base.toLowerCase() + connector
      if (!used.has(variation) && variation.length > 20 && variation.length < 200) {
        compliments.push(variation)
        used.add(variation)
      }
    }
  }

  // Fill remaining with base templates if needed
  while (compliments.length < count) {
    const base = templates[Math.floor(Math.random() * templates.length)]
    if (!used.has(base)) {
      compliments.push(base)
      used.add(base)
    }
  }

  return compliments.slice(0, count)
}

async function main() {
  console.log('Generating compliments...')
  const compliments = generateCompliments(350) // Generate 350 to ensure we have 300+ unique ones

  console.log(`Generated ${compliments.length} unique compliments`)
  console.log('Inserting into database...')

  // Clear existing compliments (optional - comment out if you want to keep existing)
  // await db.compliment.deleteMany({})

  // Insert compliments
  for (const text of compliments) {
    await db.compliment.create({
      data: {
        text,
        tags: [],
        rarity: 1,
      },
    })
  }

  console.log(`Successfully seeded ${compliments.length} compliments`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

