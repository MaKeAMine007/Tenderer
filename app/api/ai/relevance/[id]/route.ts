import { NextResponse } from 'next/server'
import { analyzeSingleTender } from '@/services/ai/relevance.service'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: Params) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  const { id } = await params

  try {
    const result = await analyzeSingleTender(id)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`POST /api/ai/relevance/${id} failed:`, err)
    const status = msg.includes('not found') ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
