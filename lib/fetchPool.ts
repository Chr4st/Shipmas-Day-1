// Concurrency-limited fetch pool for batch API requests
// Fetches N items from an API with max concurrency limit

export async function fetchPool<T>(
  url: string,
  count: number,
  concurrency: number,
  fetchFn: (url: string) => Promise<T>
): Promise<T[]> {
  const results: T[] = []
  const errors: Error[] = []
  let index = 0

  async function worker(): Promise<void> {
    while (index < count) {
      const currentIndex = index++
      try {
        const result = await fetchFn(url)
        results[currentIndex] = result
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)))
        // Continue fetching even if some fail
      }
    }
  }

  // Start workers up to concurrency limit
  const workers = Array.from({ length: Math.min(concurrency, count) }, () =>
    worker()
  )

  await Promise.all(workers)

  // Filter out undefined results (failed fetches)
  return results.filter((r): r is T => r !== undefined)
}

