/**
 * AI Intelligence Service — Layer 1
 *
 * Fast relevance check + initial recommendation for each tender.
 * Uses the Gemini provider to produce structured analysis:
 *  - Relevance verdict + score
 *  - Industry detection + keyword extraction
 *  - Concise business summary
 *  - Positive factors / risks / missing information
 *  - "Why We Can Win" — specific entry-opportunity reasoning
 *  - Recommendation (PURSUE / MAYBE / DO_NOT_PURSUE)
 *  - Confidence level
 *
 * Deterministic recommendation rules override AI output to prevent hallucination.
 */

import { createProvider } from './provider'
import { buildProfileSummary } from '@/services/company-profile.service'
import { computeMatch } from '@/services/match.service'
import * as repo from '@/repositories/tender.repository'

const BATCH_SIZE     = parseInt(process.env.RELEVANCE_BATCH_SIZE     ?? '20')
const CONCURRENCY    = parseInt(process.env.RELEVANCE_CONCURRENCY    ?? '3')
const DOC_CHAR_LIMIT = parseInt(process.env.RELEVANCE_DOC_CHAR_LIMIT ?? '6000')

export interface RelevanceProcessingResult {
  processed:   number
  relevant:    number
  notRelevant: number
  failed:      number
}

export interface RelevanceResult {
  relevant:        boolean
  score:           number
  reason:          string
  recommendation:  string
  confidence:      number
  summary:         string
  positiveFactors: string[]
  risks:           string[]
  missingInfo:     string[]
  whyWeCanWin:     string[]
  model:           string
  provider:        string
  promptTokens?:   number
  responseTokens?: number
  latencyMs:       number
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildPrompt(
  tender: {
    title:         string
    department:    string
    state:         string
    budget:        string | null
    description:   string | null
    documentText:  string | null
    matchScore:    number | null
    matchKeywords: string[]
    entryScore:    number | null
    entrySignals:  string[]
  },
  profileSummary: string
): string {
  const docText = tender.documentText
    ? tender.documentText.slice(0, DOC_CHAR_LIMIT)
    : tender.description
      ? `Description only:\n${tender.description}`
      : 'No document or description available.'

  const matchHint = tender.matchScore !== null
    ? `Pre-screening match score: ${tender.matchScore}/100. Matched keywords: ${tender.matchKeywords.join(', ') || 'none'}.`
    : ''

  const entryHint = tender.entryScore !== null
    ? `Entry opportunity score: ${tender.entryScore}/100. Entry signals: ${tender.entrySignals.join('; ') || 'none detected'}.`
    : ''

  return `You are a senior business development analyst at an Indian digital services and technology company evaluating a government tender.

COMPANY PROFILE:
${profileSummary}

---

TENDER:
Title: ${tender.title}
Department: ${tender.department}
State: ${tender.state}
Budget: ${tender.budget ?? 'Not specified'}
${matchHint}
${entryHint}

TENDER CONTENT:
${docText}

---

TASK:
1. Determine if this tender matches the company's services and capabilities.
2. Identify specific positive factors, risks, and missing information.
3. List specific reasons WHY this company can win this tender ("Why We Can Win").
4. Provide a business recommendation.

RULES:
- "relevant" = true only if the tender matches at least one core service and is not in an entirely different domain (construction, manufacturing, medical equipment, etc.).
- "score" = 1 (completely irrelevant) to 10 (perfect match for our services).
- "recommendation" must be exactly one of: PURSUE, MAYBE, DO_NOT_PURSUE.
  - PURSUE: strong match, company is likely eligible, clear opportunity.
  - MAYBE: partial match or eligibility uncertain — needs more investigation.
  - DO_NOT_PURSUE: outside our domain, or a hard exclusion applies.
- "confidence" = 0–100 (how certain you are of the recommendation).
- "summary" = 2–3 sentences: what this tender requires and why it matters to us.
- "positiveFactors" = list of specific reasons to pursue (max 5). Empty array if none.
- "risks" = list of specific concerns (timeline, eligibility, competition, scope). Max 5.
- "missingInfo" = information not visible in the tender that would affect our decision. Max 5.
- "whyWeCanWin" = specific, concrete reasons WHY this company can win this particular tender. Focus on:
  * Service alignment (e.g. "We build exactly this type of portal")
  * Eligibility advantages (MSME, Startup India, open eligibility)
  * Budget suitability
  * Experience match
  * Competitive advantages
  * Max 5 items. Empty array if we cannot realistically win.
- "reason" = one concise sentence summarising the relevance verdict.

Respond with ONLY valid JSON, no markdown:
{"relevant":true,"score":8,"recommendation":"PURSUE","confidence":72,"summary":"...","positiveFactors":["..."],"risks":["..."],"missingInfo":["..."],"whyWeCanWin":["..."],"reason":"..."}`
}

// ── Response parsing ──────────────────────────────────────────────────────────

interface RawAIResponse {
  relevant:        boolean
  score:           number
  recommendation:  string
  confidence:      number
  summary:         string
  positiveFactors: string[]
  risks:           string[]
  missingInfo:     string[]
  whyWeCanWin:     string[]
  reason:          string
}

function parseResponse(text: string): RawAIResponse {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  const parsed  = JSON.parse(cleaned) as Record<string, unknown>

  if (typeof parsed.relevant !== 'boolean')
    throw new Error(`"relevant" must be boolean, got: ${typeof parsed.relevant}`)
  if (typeof parsed.score !== 'number' || parsed.score < 1 || parsed.score > 10)
    throw new Error(`"score" must be 1-10, got: ${parsed.score}`)
  if (!['PURSUE', 'MAYBE', 'DO_NOT_PURSUE'].includes(String(parsed.recommendation)))
    throw new Error(`"recommendation" must be PURSUE/MAYBE/DO_NOT_PURSUE, got: ${parsed.recommendation}`)
  if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100)
    throw new Error(`"confidence" must be 0-100, got: ${parsed.confidence}`)
  if (typeof parsed.reason !== 'string' || !parsed.reason.trim())
    throw new Error('"reason" must be non-empty string')

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []

  return {
    relevant:        parsed.relevant,
    score:           Math.round(parsed.score),
    recommendation:  String(parsed.recommendation),
    confidence:      Math.round(parsed.confidence as number),
    summary:         typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
    positiveFactors: toStringArray(parsed.positiveFactors).slice(0, 5),
    risks:           toStringArray(parsed.risks).slice(0, 5),
    missingInfo:     toStringArray(parsed.missingInfo).slice(0, 5),
    whyWeCanWin:     toStringArray(parsed.whyWeCanWin).slice(0, 5),
    reason:          String(parsed.reason).slice(0, 500),
  }
}

// ── Deterministic recommendation override ─────────────────────────────────────
//
// AI recommendation is advisory. Deterministic rules override it to prevent
// hallucination from mis-classifying tenders.

function deriveRecommendation(
  aiRecommendation: string,
  aiConfidence:     number,
  matchScore:       number | null,
  entryScore:       number | null
): { recommendation: string; confidence: number } {
  const ms = matchScore ?? 50
  const es = entryScore ?? 0

  // Hard block: exclusion keyword detected (matchScore = 0)
  if (ms === 0) {
    return { recommendation: 'DO_NOT_PURSUE', confidence: 95 }
  }

  // Strong match + good entry opportunity → PURSUE regardless of AI uncertainty
  if (ms >= 50 && es >= 60) {
    const rec = aiRecommendation === 'DO_NOT_PURSUE' ? 'MAYBE' : 'PURSUE'
    return { recommendation: rec, confidence: Math.round((aiConfidence + ms * 0.5 + es * 0.3) / 1.8) }
  }

  // AI + match agree to pursue
  if (aiRecommendation === 'PURSUE' && ms >= 40) {
    return { recommendation: 'PURSUE', confidence: Math.round((aiConfidence + ms) / 2) }
  }

  // AI says pursue but match score is low — downgrade to MAYBE
  if (aiRecommendation === 'PURSUE' && ms < 40) {
    return { recommendation: 'MAYBE', confidence: Math.round(aiConfidence * 0.6) }
  }

  // AI says DO_NOT_PURSUE but match score is strong — let user decide
  if (aiRecommendation === 'DO_NOT_PURSUE' && ms >= 60) {
    return { recommendation: 'MAYBE', confidence: Math.round(aiConfidence * 0.5) }
  }

  // AI says DO_NOT_PURSUE and entry score is high (MSME/open/digital) — review manually
  if (aiRecommendation === 'DO_NOT_PURSUE' && es >= 50) {
    return { recommendation: 'MAYBE', confidence: Math.round(aiConfidence * 0.4) }
  }

  // AI says DO_NOT_PURSUE and match is low — agree
  if (aiRecommendation === 'DO_NOT_PURSUE') {
    return { recommendation: 'DO_NOT_PURSUE', confidence: Math.round((aiConfidence + (100 - ms)) / 2) }
  }

  // Default: use AI recommendation, blend with match score
  return {
    recommendation: aiRecommendation,
    confidence:     Math.round((aiConfidence + ms) / 2),
  }
}

// ── Core analysis ─────────────────────────────────────────────────────────────

export async function analyzeSingleTender(tenderId: string): Promise<RelevanceResult> {
  const tender = await repo.getTenderById(tenderId)
  if (!tender) throw new Error(`Tender not found: ${tenderId}`)

  await repo.updateRelevanceFields(tenderId, { relevanceStatus: 'PROCESSING' })

  const provider       = createProvider()
  const profileSummary = buildProfileSummary()

  // Compute match score if not yet done
  let matchScore    = tender.matchScore
  let matchKeywords = tender.matchKeywords as string[]
  if (matchScore === null) {
    const match  = computeMatch({
      id:           tender.id,
      title:        tender.title,
      department:   tender.department,
      state:        tender.state,
      budget:       tender.budget,
      description:  tender.description,
      documentText: tender.documentText,
    })
    matchScore    = match.score
    matchKeywords = match.matchedKeywords
    await repo.updateIntelligenceFields(tenderId, { matchScore, matchKeywords })
  }

  const prompt = buildPrompt(
    {
      title:         tender.title,
      department:    tender.department,
      state:         tender.state,
      budget:        tender.budget,
      description:   tender.description,
      documentText:  tender.documentText,
      matchScore,
      matchKeywords,
      entryScore:    tender.entryScore,
      entrySignals:  tender.entrySignals as string[],
    },
    profileSummary
  )

  let output: Awaited<ReturnType<typeof provider.complete>>
  let parsed: RawAIResponse

  const attempt = async () => {
    output = await provider.complete(prompt)
    console.log(
      `[ai] ${tenderId} — model=${output!.model} tokens=${output!.promptTokens ?? '?'}/${output!.responseTokens ?? '?'} latency=${output!.latencyMs}ms`
    )
    parsed = parseResponse(output.text)
  }

  try {
    await attempt()
  } catch (firstErr) {
    console.warn(`[ai] ${tenderId} first attempt failed: ${firstErr}. Retrying…`)
    try {
      await attempt()
    } catch (retryErr) {
      const msg = retryErr instanceof Error ? retryErr.message : String(retryErr)
      await repo.updateRelevanceFields(tenderId, {
        relevanceStatus:   'FAILED',
        relevanceError:    msg,
        relevanceCheckedAt: new Date(),
      })
      throw retryErr
    }
  }

  const { recommendation, confidence } = deriveRecommendation(
    parsed!.recommendation,
    parsed!.confidence,
    matchScore,
    tender.entryScore,
  )

  const result: RelevanceResult = {
    relevant:        parsed!.relevant,
    score:           parsed!.score,
    reason:          parsed!.reason,
    recommendation,
    confidence,
    summary:         parsed!.summary,
    positiveFactors: parsed!.positiveFactors,
    risks:           parsed!.risks,
    missingInfo:     parsed!.missingInfo,
    whyWeCanWin:     parsed!.whyWeCanWin,
    model:           output!.model,
    provider:        output!.provider,
    promptTokens:    output!.promptTokens,
    responseTokens:  output!.responseTokens,
    latencyMs:       output!.latencyMs,
  }

  await repo.updateRelevanceFields(tenderId, {
    relevanceStatus:   'COMPLETED',
    isRelevant:        result.relevant,
    relevanceScore:    result.score,
    relevanceReason:   result.reason,
    relevanceModel:    result.model,
    relevanceProvider: result.provider,
    relevanceCheckedAt: new Date(),
    relevanceError:    null,
  })

  await repo.updateIntelligenceFields(tenderId, {
    aiSummary:       result.summary,
    positiveFactors: result.positiveFactors,
    risks:           result.risks,
    missingInfo:     result.missingInfo,
    whyWeCanWin:     result.whyWeCanWin,
    recommendation:  result.recommendation as 'PURSUE' | 'MAYBE' | 'DO_NOT_PURSUE',
    confidence:      result.confidence,
    intelligenceAt:  new Date(),
  })

  console.log(
    `[ai] ${tenderId} → relevant=${result.relevant} score=${result.score} recommendation=${result.recommendation}(${result.confidence}%) — ${result.reason.slice(0, 80)}`
  )

  return result
}

// ── Batch processing ──────────────────────────────────────────────────────────

export async function analyzePendingTenders(): Promise<RelevanceProcessingResult> {
  const tenders = await repo.getPendingRelevanceTenders(BATCH_SIZE)

  if (tenders.length === 0) {
    console.log('[ai] No pending tenders to analyse')
    return { processed: 0, relevant: 0, notRelevant: 0, failed: 0 }
  }

  console.log(
    `[ai] Starting batch — ${tenders.length} tender(s), concurrency=${CONCURRENCY}, model=${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'}`
  )

  let relevant = 0
  let notRelevant = 0
  let failed = 0
  let done = 0

  for (let i = 0; i < tenders.length; i += CONCURRENCY) {
    const batch      = tenders.slice(i, i + CONCURRENCY)
    const batchNum   = Math.floor(i / CONCURRENCY) + 1
    const totalBatches = Math.ceil(tenders.length / CONCURRENCY)

    console.log(`[ai] Batch ${batchNum}/${totalBatches} — ${batch.length} tender(s)`)

    const results = await Promise.allSettled(batch.map((t) => analyzeSingleTender(t.id)))

    results.forEach((r) => {
      done++
      if (r.status === 'fulfilled') {
        if (r.value.relevant) relevant++
        else notRelevant++
      } else {
        failed++
        console.error(`[ai] Tender failed: ${r.reason}`)
      }
    })

    console.log(`[ai] Progress ${done}/${tenders.length} — relevant:${relevant} notRelevant:${notRelevant} failed:${failed}`)
  }

  console.log(`[ai] Done — relevant:${relevant} notRelevant:${notRelevant} failed:${failed}`)
  return { processed: tenders.length, relevant, notRelevant, failed }
}
