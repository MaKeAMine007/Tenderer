import { NextResponse } from 'next/server'
import { triggerRun } from '@/services/scheduler.service'

export const maxDuration = 300

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await triggerRun('scheduler')

    if (!result.started) {
      return NextResponse.json(
        { skipped: true, reason: result.reason, existingRunId: result.existingRunId },
        { status: 200 }
      )
    }

    return NextResponse.json({
      runId: result.run.id,
      status: result.run.status,
      totalNew: result.pipeline.totalNew,
      totalFetched: result.pipeline.totalFetched,
      durationMs: result.pipeline.durationMs,
    })
  } catch (err) {
    console.error('GET /api/cron/scrape failed:', err)
    return NextResponse.json({ error: 'Cron scrape failed' }, { status: 500 })
  }
}
