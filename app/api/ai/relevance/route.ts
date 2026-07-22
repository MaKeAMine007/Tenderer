import { NextResponse } from 'next/server'
import { analyzePendingTenders } from '@/services/ai/relevance.service'
import { runMatchEngine } from '@/services/match.service'
import { skipLowScoreTenders, resetStuckProcessingStates } from '@/repositories/tender.repository'

export async function POST() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 })
  }

  try {
    // Phase 0: Reset any tenders stuck in PROCESSING from a prior crashed run
    const stuck = await resetStuckProcessingStates()
    if (stuck.relevance > 0 || stuck.layer2 > 0) {
      console.log(`[ai/relevance] Reset stuck: docs=${stuck.docs} relevance=${stuck.relevance} layer2=${stuck.layer2}`)
    }

    // Phase 1: Run match engine on tenders without scores — required before AI can queue them
    const matchResult = await runMatchEngine()
    if (matchResult.processed > 0) {
      console.log(`[ai/relevance] Match engine scored ${matchResult.processed} tender(s)`)
    }

    // Phase 2: Skip low-score tenders so they don't block the AI queue permanently
    const skipped = await skipLowScoreTenders()
    if (skipped > 0) {
      console.log(`[ai/relevance] Skipped ${skipped} low-score tender(s)`)
    }

    // Phase 3: AI Layer 1 analysis on qualifying tenders
    const result = await analyzePendingTenders()
    return NextResponse.json({ ...result, matchScored: matchResult.processed, skipped })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('POST /api/ai/relevance failed:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
