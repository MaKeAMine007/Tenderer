import { NextResponse } from 'next/server'
import { triggerRun } from '@/services/scheduler.service'

export const maxDuration = 300

export async function POST() {
  try {
    const result = await triggerRun('manual')

    if (!result.started) {
      return NextResponse.json(
        { error: result.reason, existingRunId: result.existingRunId },
        { status: 409 }
      )
    }

    const { run, pipeline } = result

    return NextResponse.json({
      run,
      results: pipeline.results,
      totalFetched: pipeline.totalFetched,
      totalNew: pipeline.totalNew,
      totalUpdated: pipeline.totalUpdated,
      totalSkipped: pipeline.totalSkipped,
      totalFailed: pipeline.totalFailed,
      durationMs: pipeline.durationMs,
    })
  } catch (err) {
    console.error('POST /api/scrape failed:', err)
    return NextResponse.json({ error: 'Scrape failed' }, { status: 500 })
  }
}
