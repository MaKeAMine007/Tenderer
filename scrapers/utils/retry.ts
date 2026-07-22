export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made')
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * 2 ** (attempt - 1)
        console.warn(
          `[retry] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms`
        )
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}
