import { NextResponse } from 'next/server'
import { markTenderViewed } from '@/services/tender.service'

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tender = await markTenderViewed(id)
    return NextResponse.json({ tender })
  } catch (err) {
    console.error('PATCH /api/tenders/[id]/viewed failed:', err)
    return NextResponse.json({ error: 'Failed to update tender' }, { status: 500 })
  }
}
