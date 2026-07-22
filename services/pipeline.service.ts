import { runAllScrapers } from '@/scrapers'
import { processPendingDocuments, DocumentProcessingResult } from './document.service'
import { analyzePendingTenders, RelevanceProcessingResult } from './ai/relevance.service'
import { runLayer2Batch, Layer2ProcessingResult } from './ai/layer2.service'
import { runMatchEngine } from './match.service'
import { runEligibilityEngine, EligibilityEngineResult } from './eligibility.service'
import { runEntryOpportunityEngine } from './entry-opportunity.service'
import { resetStuckProcessingStates, skipLowScoreTenders } from '@/repositories/tender.repository'
import { ScraperResult } from '@/types'

// Hard ceiling for the entire pipeline — comfortably below Vercel's 300s maxDuration.
const PIPELINE_TIMEOUT_MS = parseInt(process.env.PIPELINE_TIMEOUT_MS ?? '240000')

export interface PipelineResult {
  results:       ScraperResult[]
  totalFetched:  number
  totalNew:      number
  totalUpdated:  number
  totalSkipped:  number
  totalFailed:   number
  documents:     DocumentProcessingResult
  matched:       number
  eligibility:   EligibilityEngineResult
  relevance:     RelevanceProcessingResult
  layer2:        Layer2ProcessingResult
  durationMs:    number
}

function withTimeout<T>(fn: () => Promise<T>, label: string, ms: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[pipeline] ${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

async function _executePipeline(): Promise<PipelineResult> {
  const start = Date.now()
  const log   = (msg: string) => console.log(`[pipeline][${Date.now() - start}ms] ${msg}`)
  const safe  = async <T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> => {
    try {
      log(`Start: ${label}`)
      const result = await fn()
      log(`Done: ${label}`)
      return result
    } catch (err) {
      console.error(`[pipeline] ${label} failed:`, err)
      return fallback
    }
  }

  // ── Phase 0: Reset stuck PROCESSING states from prior crashed runs ──
  const stuck = await resetStuckProcessingStates().catch((err: unknown) => {
    console.error('[pipeline] resetStuckProcessingStates failed:', err)
    return { docs: 0, relevance: 0, layer2: 0 }
  })
  if (stuck.docs || stuck.relevance || stuck.layer2) {
    log(`Phase 0: Reset stuck states — docs:${stuck.docs} relevance:${stuck.relevance} layer2:${stuck.layer2}`)
  }

  // ── Phase 1+2: Scrape all portals in parallel ──
  log('Phase 1: Scraping portals')
  const results = await runAllScrapers()
  log(`Phase 1 done — fetched:${results.reduce((s, r) => s + r.fetched, 0)} new:${results.reduce((s, r) => s + r.newCount, 0)}`)

  // ── Phase 3: Document text extraction ──
  const documents = await safe<DocumentProcessingResult>(
    'Phase 3: Document extraction',
    { processed: 0, succeeded: 0, failed: 0, needsReview: 0 },
    () => processPendingDocuments()
  )

  // ── Phase 4: Deterministic match engine (no API cost) ──
  const matchResult = await safe(
    'Phase 4: Match engine',
    { processed: 0 },
    () => runMatchEngine()
  )

  // ── Phase 4b: Skip low-score tenders before AI (prevents permanent PENDING) ──
  const skipped = await skipLowScoreTenders().catch((err: unknown) => {
    console.error('[pipeline] skipLowScoreTenders failed:', err)
    return 0
  })
  if (skipped > 0) log(`Phase 4b: Skipped ${skipped} low-score tenders`)

  // ── Phase 4c: Entry Opportunity Engine (deterministic, no API cost) ──
  await safe(
    'Phase 4c: Entry Opportunity Engine',
    { processed: 0, high: 0, medium: 0, low: 0 },
    () => runEntryOpportunityEngine()
  )

  // ── Phase 5: Deterministic eligibility engine (no API cost) ──
  const eligibility = await safe<EligibilityEngineResult>(
    'Phase 5: Eligibility engine',
    { processed: 0, eligible: 0, likelyElig: 0, unknown: 0, notEligible: 0 },
    () => runEligibilityEngine()
  )

  // ── Phase 6: AI Layer 1 — relevance + initial recommendation ──
  const relevance = await safe<RelevanceProcessingResult>(
    'Phase 6: AI Layer 1',
    { processed: 0, relevant: 0, notRelevant: 0, failed: 0 },
    async () => {
      if (!process.env.GEMINI_API_KEY) {
        console.warn('[pipeline] GEMINI_API_KEY not set — skipping AI phases')
        return { processed: 0, relevant: 0, notRelevant: 0, failed: 0 }
      }
      return analyzePendingTenders()
    }
  )

  // ── Phase 7: AI Layer 2 — deep analysis for promising tenders only ──
  const layer2 = await safe<Layer2ProcessingResult>(
    'Phase 7: AI Layer 2',
    { processed: 0, succeeded: 0, failed: 0, skipped: 0 },
    async () => {
      if (!process.env.GEMINI_API_KEY) return { processed: 0, succeeded: 0, failed: 0, skipped: 0 }
      return runLayer2Batch()
    }
  )

  return {
    results,
    totalFetched:  results.reduce((s, r) => s + r.fetched,  0),
    totalNew:      results.reduce((s, r) => s + r.newCount,  0),
    totalUpdated:  results.reduce((s, r) => s + r.updated,   0),
    totalSkipped:  results.reduce((s, r) => s + r.skipped,   0),
    totalFailed:   results.reduce((s, r) => s + r.failed,    0),
    documents,
    matched:       matchResult.processed,
    eligibility,
    relevance,
    layer2,
    durationMs:    Date.now() - start,
  }
}

export async function executePipeline(): Promise<PipelineResult> {
  return withTimeout(_executePipeline, 'full pipeline', PIPELINE_TIMEOUT_MS)
}
