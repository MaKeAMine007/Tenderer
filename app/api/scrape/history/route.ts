import { NextResponse } from 'next/server'
import { getHistory } from '@/services/scraper-run.service'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)
    const runs = await getHistory(limit)
    return NextResponse.json({ runs })
  } catch (err) {
    console.error('GET /api/scrape/history failed:', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
