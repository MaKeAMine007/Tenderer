import { executePipeline } from './pipeline.service'
import { acquireLock, completeRun, failRun } from './scraper-run.service'

export type TriggerSource = 'manual' | 'scheduler'

export type TriggerResult =
  | { started: false; reason: string; existingRunId: string }
  | { started: true; run: Awaited<ReturnType<typeof completeRun>>; pipeline: Awaited<ReturnType<typeof executePipeline>> }

export async function triggerRun(triggeredBy: TriggerSource): Promise<TriggerResult> {
  const lock = await acquireLock(triggeredBy)

  if (!lock.acquired) {
    return {
      started: false,
      reason: 'A scrape is already in progress',
      existingRunId: lock.existingRunId,
    }
  }

  const { runId } = lock

  try {
    const pipeline = await executePipeline()
    const run = await completeRun(runId, pipeline)
    return { started: true, run, pipeline }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await failRun(runId, msg)
    throw err
  }
}
