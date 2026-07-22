import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIProvider, ProviderOutput } from '../provider'

// 3 retries max: total wait is ~35s (5s + 10s + 20s) before giving up.
// This keeps a single tender from blocking the batch for minutes.
const MAX_RATE_LIMIT_RETRIES = parseInt(process.env.GEMINI_MAX_RETRIES ?? '3')
const BASE_BACKOFF_MS = parseInt(process.env.GEMINI_BASE_BACKOFF_MS ?? '5000')
const MAX_BACKOFF_MS = 30_000

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests')
}

// Daily quota exhaustion cannot be resolved by retrying — fail immediately.
function isDailyQuotaExhausted(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('PerDay') || msg.includes('per_day') || msg.includes('daily')
}

// Extracts suggested wait time from Gemini error: "Please retry in 29.27s"
function extractRetryDelayMs(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err)
  const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i)
  if (match) return Math.ceil(parseFloat(match[1])) * 1000 + 1000 // +1s buffer
  return 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'
  readonly model: string

  private client: GoogleGenerativeAI

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set')
    this.client = new GoogleGenerativeAI(apiKey)
    this.model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'
  }

  async complete(prompt: string): Promise<ProviderOutput> {
    const callStart = Date.now()
    let attempt = 0

    while (true) {
      try {
        const genModel = this.client.getGenerativeModel({ model: this.model })

        const result = await genModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        })

        const text = result.response.text()
        const usage = result.response.usageMetadata

        return {
          text,
          model: this.model,
          provider: this.name,
          promptTokens: usage?.promptTokenCount,
          responseTokens: usage?.candidatesTokenCount,
          latencyMs: Date.now() - callStart,
        }
      } catch (err) {
        // Daily quota exhaustion cannot be resolved by retrying — propagate immediately
        if (isRateLimitError(err) && isDailyQuotaExhausted(err)) {
          console.error(`[gemini] daily quota exhausted — not retrying (model: ${this.model})`)
          throw err
        }

        if (!isRateLimitError(err) || attempt >= MAX_RATE_LIMIT_RETRIES) {
          throw err
        }

        attempt++

        // Prefer Gemini's suggested delay; fall back to exponential backoff
        const suggested = extractRetryDelayMs(err)
        const exponential = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS)
        const waitMs = suggested > 0 ? suggested : exponential

        console.log(
          `[gemini] rate limited — waiting ${(waitMs / 1000).toFixed(1)}s then retry ${attempt}/${MAX_RATE_LIMIT_RETRIES} (model: ${this.model})`
        )
        await sleep(waitMs)
      }
    }
  }
}
