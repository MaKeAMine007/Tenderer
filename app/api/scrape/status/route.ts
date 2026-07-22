import { NextResponse } from 'next/server'
import { getStatus } from '@/services/scraper-run.service'

export async function GET() {
  try {
    const status = await getStatus()
    return NextResponse.json(status)
  } catch (err) {
    console.error('GET /api/scrape/status failed:', err)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
