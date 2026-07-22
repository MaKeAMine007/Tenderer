import { NextResponse } from 'next/server'

const SAFE_KEYS = [
  'NODE_ENV',
  'NEXTAUTH_URL',
  'GEMINI_MODEL',
  'RELEVANCE_BATCH_SIZE',
  'RELEVANCE_CONCURRENCY',
  'RELEVANCE_DOC_CHAR_LIMIT',
]

const PRESENCE_ONLY_KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'GEMINI_API_KEY',
  'CRON_SECRET',
]

export async function GET() {
  const result: Record<string, string | null> = {}

  for (const key of SAFE_KEYS) {
    result[key] = process.env[key] ?? null
  }

  for (const key of PRESENCE_ONLY_KEYS) {
    result[key] = process.env[key] ? `[set]` : null
  }

  return NextResponse.json(result)
}
