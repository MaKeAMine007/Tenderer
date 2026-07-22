/**
 * AI Layer 2 — Deep Analysis
 *
 * Only runs for tenders that passed Layer 1 (recommendation != DO_NOT_PURSUE).
 * Provides a deep, document-level analysis producing:
 *   - Professional executive summary (4-5 sentences)
 *   - Specific deliverables extracted from tender content
 *   - Qualifications / experience requirements
 *   - Commercial and technical concerns
 *   - Estimated effort and proposal difficulty
 *   - Recommended next action
 *
 * This is an OPTIONAL second AI pass — keep it targeted and avoid running it
 * on DO_NOT_PURSUE tenders to control API costs.
 */

import { createProvider } from './provider'
import { prisma } from '@/lib/prisma'

const BATCH_SIZE     = parseInt(process.env.LAYER2_BATCH_SIZE     ?? '10')
const CONCURRENCY    = parseInt(process.env.LAYER2_CONCURRENCY    ?? '2')
const DOC_CHAR_LIMIT = parseInt(process.env.LAYER2_DOC_CHAR_LIMIT ?? '8000')

// Minimum matchScore to qualify for Layer 2
const MIN_MATCH_SCORE = parseInt(process.env.LAYER2_MIN_MATCH_SCORE ?? '30')

export interface Layer2Result {
  summary:        string
  deliverables:   string[]
  qualifications: string[]
  concerns:       string[]
  effort:         string
  difficulty:     'LOW' | 'MEDIUM' | 'HIGH'
  nextAction:     string
}

export interface Layer2ProcessingResult {
  processed: number
  succeeded: number
  failed:    number
  skipped:   number
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildLayer2Prompt(tender: {
  title:          string
  department:     string
  state:          string
  budget:         string | null
  description:    string | null
  documentText:   string | null
  matchScore:     number | null
  aiSummary:      string | null
  recommendation: string | null
}): string {
  const content = tender.documentText
    ? tender.documentText.slice(0, DOC_CHAR_LIMIT)
    : tender.description
      ? `Description:\n${tender.description}`
      : 'No detailed content available.'

  return `You are a senior proposal manager at a digital services and technology company preparing a detailed bid analysis. Your company specialises in website development, web portals, mobile apps, ERP/CRM systems, AI solutions, digital marketing, branding, and UI/UX design for government clients in India.

TENDER: ${tender.title}
Department: ${tender.department}
State: ${tender.state}
Budget: ${tender.budget ?? 'Not specified'}
Preliminary Assessment: ${tender.aiSummary ?? 'Not available'}
Initial Recommendation: ${tender.recommendation ?? 'Not determined'}

FULL TENDER CONTENT:
${content}

TASK:
Perform a detailed analysis of this tender from a bid-preparation perspective.

Return ONLY valid JSON (no markdown):
{
  "summary": "4-5 sentence professional executive summary covering: what the tender requires, why it is a good opportunity for a digital/tech firm, key scope elements, timeline and budget outlook",
  "deliverables": ["specific deliverable 1", "deliverable 2"],
  "qualifications": ["required qualification or experience criterion 1", "certification or credential 2"],
  "concerns": ["commercial or technical concern 1", "risk 2"],
  "effort": "estimate like '3-4 months, team of 4 including 2 developers, 1 designer, 1 PM'",
  "difficulty": "LOW or MEDIUM or HIGH",
  "nextAction": "specific recommended next step for the bid team (e.g. 'Download RFP and review technical specifications', 'Check MSME exemption clause', 'Prepare portfolio of 3 similar projects')"
}`
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseLayer2Response(text: string): Layer2Result {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  const parsed  = JSON.parse(cleaned) as Record<string, unknown>

  const toArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 7) : []

  const difficulty = String(parsed.difficulty ?? 'MEDIUM').toUpperCase()

  return {
    summary:        typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1200) : '',
    deliverables:   toArr(parsed.deliverables),
    qualifications: toArr(parsed.qualifications),
    concerns:       toArr(parsed.concerns),
    effort:         typeof parsed.effort === 'string' ? parsed.effort.slice(0, 200) : 'Unknown',
    difficulty:     (['LOW', 'MEDIUM', 'HIGH'].includes(difficulty) ? difficulty : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
    nextAction:     typeof parsed.nextAction === 'string' ? parsed.nextAction.slice(0, 400) : '',
  }
}

// ── Single tender analysis ────────────────────────────────────────────────────

export async function analyzeLayer2(tenderId: string): Promise<Layer2Result> {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } })
  if (!tender) throw new Error(`Tender not found: ${tenderId}`)

  await prisma.tender.update({
    where: { id: tenderId },
    data: { aiLayer2Status: 'PROCESSING' },
  })

  const provider = createProvider()
  const prompt   = buildLayer2Prompt({
    title:          tender.title,
    department:     tender.department,
    state:          tender.state,
    budget:         tender.budget,
    description:    tender.description,
    documentText:   tender.documentText,
    matchScore:     tender.matchScore,
    aiSummary:      tender.aiSummary,
    recommendation: tender.recommendation,
  })

  let result: Layer2Result

  try {
    const output = await provider.complete(prompt)
    console.log(`[ai-l2] ${tenderId} — latency=${output.latencyMs}ms tokens=${output.promptTokens ?? '?'}/${output.responseTokens ?? '?'}`)
    result = parseLayer2Response(output.text)
  } catch (firstErr) {
    console.warn(`[ai-l2] ${tenderId} first attempt failed: ${firstErr}. Retrying…`)
    try {
      const output = await provider.complete(prompt)
      result = parseLayer2Response(output.text)
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      await prisma.tender.update({
        where: { id: tenderId },
        data: { aiLayer2Status: 'FAILED', aiLayer2At: new Date() },
      })
      throw retryErr
    }
  }

  await prisma.tender.update({
    where: { id: tenderId },
    data: {
      aiLayer2Status:        'COMPLETED',
      aiLayer2Summary:       result.summary,
      aiLayer2Deliverables:  result.deliverables,
      aiLayer2Qualifications: result.qualifications,
      aiLayer2Concerns:      result.concerns,
      aiLayer2Effort:        result.effort,
      aiLayer2Difficulty:    result.difficulty,
      aiLayer2NextAction:    result.nextAction,
      aiLayer2At:            new Date(),
      // Update nextStep on the main intelligence record too
      nextStep:              result.nextAction,
    },
  })

  console.log(`[ai-l2] ${tenderId} → difficulty=${result.difficulty} deliverables=${result.deliverables.length}`)
  return result
}

// ── Batch runner ──────────────────────────────────────────────────────────────

export async function runLayer2Batch(): Promise<Layer2ProcessingResult> {
  // Only run on tenders where:
  //   1. AI Layer 1 completed successfully
  //   2. Recommendation is not DO_NOT_PURSUE
  //   3. matchScore meets the minimum threshold
  //   4. Layer 2 hasn't run yet
  const eligible = await prisma.tender.findMany({
    where: {
      relevanceStatus: 'COMPLETED',
      recommendation:  { not: 'DO_NOT_PURSUE', notIn: [] },
      matchScore:      { gte: MIN_MATCH_SCORE },
      aiLayer2Status:  null,
    },
    select: { id: true },
    orderBy: { matchScore: 'desc' },  // highest-scoring first
    take: BATCH_SIZE,
  })

  if (eligible.length === 0) {
    console.log('[ai-l2] No eligible tenders for deep analysis')
    return { processed: 0, succeeded: 0, failed: 0, skipped: 0 }
  }

  console.log(`[ai-l2] Running deep analysis on ${eligible.length} tender(s) (concurrency=${CONCURRENCY})`)

  let succeeded = 0, failed = 0

  for (let i = 0; i < eligible.length; i += CONCURRENCY) {
    const batch = eligible.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map((t) => analyzeLayer2(t.id)))
    results.forEach((r) => {
      if (r.status === 'fulfilled') succeeded++
      else { failed++; console.error(`[ai-l2] Failed: ${r.reason}`) }
    })
  }

  // Mark remaining tenders (below threshold) as SKIPPED so they don't get re-queued
  // This runs asynchronously and doesn't affect the return value
  prisma.tender.updateMany({
    where: {
      relevanceStatus: 'COMPLETED',
      OR: [
        { recommendation: 'DO_NOT_PURSUE' },
        { matchScore: { lt: MIN_MATCH_SCORE } },
      ],
      aiLayer2Status: null,
    },
    data: { aiLayer2Status: 'SKIPPED', aiLayer2At: new Date() },
  }).catch((err: unknown) => console.error('[ai-l2] Skip batch failed:', err))

  console.log(`[ai-l2] Done — succeeded:${succeeded} failed:${failed}`)
  return { processed: eligible.length, succeeded, failed, skipped: 0 }
}
