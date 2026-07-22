import { NextResponse } from 'next/server'
import { getTenderById } from '@/services/tender.service'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tender = await getTenderById(id)
    if (!tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 })
    }
    return NextResponse.json({ tender })
  } catch (err) {
    console.error('GET /api/tenders/[id] failed:', err)
    return NextResponse.json({ error: 'Failed to fetch tender' }, { status: 500 })
  }
}
