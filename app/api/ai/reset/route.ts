import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Resets FAILED relevance tenders back to PENDING so they get retried on next batch run.
// Also resets stuck PROCESSING states.
export async function POST() {
  try {
    const [failedReset, processingReset] = await Promise.all([
      prisma.tender.updateMany({
        where: { relevanceStatus: 'FAILED' },
        data: {
          relevanceStatus: 'PENDING',
          relevanceError: null,
        },
      }),
      prisma.tender.updateMany({
        where: { relevanceStatus: 'PROCESSING' },
        data: { relevanceStatus: 'PENDING' },
      }),
    ])

    console.log(
      `[ai/reset] Reset ${failedReset.count} FAILED + ${processingReset.count} PROCESSING → PENDING`
    )

    return NextResponse.json({
      failedReset: failedReset.count,
      processingReset: processingReset.count,
      message: `Reset ${failedReset.count + processingReset.count} tenders to PENDING`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('POST /api/ai/reset failed:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
