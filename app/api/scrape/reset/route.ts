import { NextResponse } from 'next/server'
import { resetStuckRuns } from '@/services/scraper-run.service'

/**
 * POST /api/scrape/reset
 *
 * Manually force-fails any run that is stuck in RUNNING beyond the stale threshold.
 * Useful when a server restart or Vercel timeout left a run permanently hung.
 * The status endpoint also calls this automatically on every poll, so manual
 * intervention is rarely needed.
 */
export async function POST() {
  try {
    const cleared = await resetStuckRuns()
    return NextResponse.json({
      cleared,
      message: cleared > 0 ? `${cleared} stuck run(s) reset to FAILED` : 'No stuck runs found',
    })
  } catch (err) {
    console.error('POST /api/scrape/reset failed:', err)
    return NextResponse.json({ error: 'Failed to reset runs' }, { status: 500 })
  }
}
