import { prisma } from '@/lib/prisma'
import { PipelineResult } from './pipeline.service'

type TriggerSource = 'manual' | 'scheduler'

// Runs that remain RUNNING beyond this threshold are considered hung and auto-failed.
// Must be longer than the pipeline timeout (240s) plus buffer for DB operations.
const STALE_THRESHOLD_MS = parseInt(process.env.SCRAPER_STALE_THRESHOLD_MS ?? String(10 * 60 * 1000)) // 10 min default

async function clearStaleRuns(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const stale = new Date(Date.now() - STALE_THRESHOLD_MS)
  const cleared = await tx.scraperRun.updateMany({
    where: { status: 'RUNNING', startedAt: { lt: stale } },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorSummary: `Auto-terminated: exceeded ${STALE_THRESHOLD_MS / 60000} minute threshold without completing`,
    },
  })
  if (cleared.count > 0) {
    console.warn(`[scraper-run] Auto-terminated ${cleared.count} stale run(s)`)
  }
  return cleared.count
}

export async function acquireLock(triggeredBy: TriggerSource) {
  return prisma.$transaction(async (tx) => {
    await clearStaleRuns(tx)

    const existing = await tx.scraperRun.findFirst({
      where: { status: 'RUNNING' },
      orderBy: { startedAt: 'desc' },
    })

    if (existing) {
      return { acquired: false as const, existingRunId: existing.id }
    }

    const run = await tx.scraperRun.create({
      data: { triggeredBy, startedAt: new Date() },
    })

    return { acquired: true as const, runId: run.id }
  })
}

export async function completeRun(runId: string, pipeline: PipelineResult) {
  const { results, durationMs } = pipeline
  const failedPortals  = results.filter((r) => r.errors.length > 0)
  const successPortals = results.filter((r) => r.errors.length === 0)

  const status =
    failedPortals.length === 0          ? 'SUCCESS'
    : successPortals.length > 0         ? 'PARTIAL_SUCCESS'
    : /* all failed */                    'FAILED'

  const errorSummary = failedPortals.length
    ? failedPortals.map((r) => `[${r.portal}] ${r.errors.join('; ')}`).join('\n')
    : null

  return prisma.scraperRun.update({
    where: { id: runId },
    data: {
      status,
      completedAt: new Date(),
      durationMs,
      totalFetched:  pipeline.totalFetched,
      totalNew:      pipeline.totalNew,
      totalUpdated:  pipeline.totalUpdated,
      totalSkipped:  pipeline.totalSkipped,
      totalFailed:   pipeline.totalFailed,
      perPortalResults: results as object[],
      errorSummary,
    },
  })
}

export async function failRun(runId: string, error: string) {
  return prisma.scraperRun.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      errorSummary: error.slice(0, 2000), // guard against giant error strings
    },
  })
}

export async function resetStuckRuns(): Promise<number> {
  return prisma.$transaction(async (tx) => clearStaleRuns(tx))
}

export async function getStatus() {
  // Proactively clear stale runs on each status check so the dashboard self-heals
  // without requiring a new scrape trigger to unstick a hung run.
  await resetStuckRuns()

  const [currentRun, lastCompletedRun] = await Promise.all([
    prisma.scraperRun.findFirst({
      where: { status: 'RUNNING' },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.scraperRun.findFirst({
      where: { status: { in: ['SUCCESS', 'PARTIAL_SUCCESS'] } },
      orderBy: { completedAt: 'desc' },
    }),
  ])

  return { isRunning: !!currentRun, currentRun, lastCompletedRun }
}

export async function getHistory(limit = 30) {
  return prisma.scraperRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit,
  })
}
