import { NextResponse } from 'next/server'
import { getAllTenders, getTenderStats } from '@/services/tender.service'

export async function GET() {
  try {
    const [tenders, stats] = await Promise.all([getAllTenders(), getTenderStats()])
    return NextResponse.json({ tenders, stats })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('GET /api/tenders failed:', msg, err)
    return NextResponse.json(
      { error: 'Failed to fetch tenders', detail: msg },
      { status: 500 }
    )
  }
}
