import { NextResponse } from 'next/server'
import { runLayer2Batch } from '@/services/ai/layer2.service'

export async function POST() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  try {
    const result = await runLayer2Batch()
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('POST /api/ai/layer2 failed:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
