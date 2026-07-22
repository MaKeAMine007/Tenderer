/**
 * Deterministic Match Engine
 *
 * Scores every tender against the MAM company profile using rule-based logic.
 * No AI API calls — fast and cheap.
 * Runs before AI analysis to provide context and catch hard exclusions early.
 */

import { prisma } from '@/lib/prisma'
import { getCompanyProfile, getKeywords, getExclusionKeywords, getPreferredStates, getBudgetRange, getPreferredCategories } from './company-profile.service'

const BATCH_SIZE = parseInt(process.env.MATCH_BATCH_SIZE ?? '50')

export interface MatchResult {
  score: number           // 0–100 overall
  matchedKeywords: string[]
  blockedBy: string[]     // exclusion keywords found
  stateMatch: boolean
  budgetInRange: boolean | null  // null = budget unknown
  categoryMatch: boolean
  breakdown: {
    keyword: number   // max 40
    state: number     // max 20
    budget: number    // max 20
    category: number  // max 20
  }
}

// ── Budget parsing ────────────────────────────────────────────────────────────

const CRORE = 10_000_000
const LAKH  = 100_000

function parseBudgetINR(raw: string | null): number | null {
  if (!raw) return null
  const s = raw.replace(/,/g, '').toLowerCase()

  // Remove currency symbols and common prefixes
  const cleaned = s
    .replace(/₹|rs\.?|inr/gi, '')
    .trim()

  // Check for crore
  const croreMatch = cleaned.match(/([\d.]+)\s*cr(?:ore)?/i)
  if (croreMatch) return parseFloat(croreMatch[1]) * CRORE

  // Check for lakh
  const lakhMatch = cleaned.match(/([\d.]+)\s*(?:lakh?|lac?|l)\b/i)
  if (lakhMatch) return parseFloat(lakhMatch[1]) * LAKH

  // Check for thousand
  const thousandMatch = cleaned.match(/([\d.]+)\s*(?:thousand|k)\b/i)
  if (thousandMatch) return parseFloat(thousandMatch[1]) * 1000

  // Plain number
  const num = parseFloat(cleaned.replace(/[^\d.]/g, ''))
  return isNaN(num) ? null : num
}

function scoreBudget(budget: string | null): { score: number; inRange: boolean | null } {
  const amount = parseBudgetINR(budget)
  if (amount === null) return { score: 10, inRange: null } // unknown = give partial credit

  const range = getBudgetRange()

  // Outside absolute min/max — definitely not viable
  if (range.minINR && amount < range.minINR) return { score: 0, inRange: false }
  if (range.maxINR && amount > range.maxINR) return { score: 0, inRange: false }

  // Within preferred range — ideal
  if (range.preferredMinINR && range.preferredMaxINR &&
      amount >= range.preferredMinINR && amount <= range.preferredMaxINR) {
    return { score: 20, inRange: true }
  }

  // Within absolute range but not preferred — still viable, partial score
  return { score: 10, inRange: true }
}

// ── Text building ─────────────────────────────────────────────────────────────

function buildSearchText(tender: TenderForMatch): string {
  return [
    tender.title,
    tender.department,
    tender.description,
    tender.documentText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// ── Core scoring ──────────────────────────────────────────────────────────────

interface TenderForMatch {
  id: string
  title: string
  department: string
  state: string
  budget: string | null
  description: string | null
  documentText: string | null
}

export function computeMatch(tender: TenderForMatch): MatchResult {
  const text = buildSearchText(tender)
  const keywords     = getKeywords()
  const exclusions   = getExclusionKeywords()
  const preferredStates = getPreferredStates()
  const categories   = getPreferredCategories()

  // ── Hard block: exclusion keywords ──
  const blockedBy = exclusions.filter((kw) => text.includes(kw.toLowerCase()))
  if (blockedBy.length > 0) {
    return {
      score: 0,
      matchedKeywords: [],
      blockedBy,
      stateMatch: false,
      budgetInRange: null,
      categoryMatch: false,
      breakdown: { keyword: 0, state: 0, budget: 0, category: 0 },
    }
  }

  // ── Keyword match (max 40 pts) ──
  // Short keywords (≤ 4 chars) require word-boundary matching to avoid false positives.
  // e.g. "ai" should not match "maintenance", "repair", "available".
  const matchedKeywords = keywords.filter((kw) => {
    const lower = kw.toLowerCase()
    if (lower.length <= 4) {
      const re = new RegExp(`(?<![a-z])${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i')
      return re.test(text)
    }
    return text.includes(lower)
  })
  // Diminishing returns: first keyword = 16 pts, each additional = 8 pts, capped at 40
  const keywordScore = matchedKeywords.length === 0
    ? 0
    : Math.min(40, 16 + (matchedKeywords.length - 1) * 8)

  // ── State match (max 20 pts) ──
  const stateText   = tender.state.toLowerCase()
  const deptText    = tender.department.toLowerCase()
  const stateMatch  = preferredStates.some(
    (s) => stateText.includes(s.toLowerCase()) || deptText.includes(s.toLowerCase())
  )
  const stateScore  = stateMatch ? 20 : 5  // 5 pts for non-preferred (still viable nationally)

  // ── Budget match (max 20 pts) ──
  const { score: budgetScore, inRange: budgetInRange } = scoreBudget(tender.budget)

  // ── Category match (max 20 pts) ──
  const categoryMatch = categories.some((cat) => text.includes(cat.toLowerCase()))
  const categoryScore = categoryMatch ? 20 : 0

  const score = Math.min(100, keywordScore + stateScore + budgetScore + categoryScore)

  return {
    score,
    matchedKeywords,
    blockedBy: [],
    stateMatch,
    budgetInRange,
    categoryMatch,
    breakdown: {
      keyword:  keywordScore,
      state:    stateScore,
      budget:   budgetScore,
      category: categoryScore,
    },
  }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

export interface MatchEngineResult {
  processed: number
}

export async function runMatchEngine(): Promise<MatchEngineResult> {
  // Process tenders that haven't been scored yet (matchScore is null)
  // or that were updated recently (matchScore should be recomputed when tender changes)
  const pending = await prisma.tender.findMany({
    where: { matchScore: null },
    select: {
      id: true,
      title: true,
      department: true,
      state: true,
      budget: true,
      description: true,
      documentText: true,
    },
    take: BATCH_SIZE,
  })

  if (pending.length === 0) return { processed: 0 }

  console.log(`[match] Scoring ${pending.length} tender(s)`)

  let processed = 0
  for (const tender of pending) {
    try {
      const result = computeMatch(tender)
      await prisma.tender.update({
        where: { id: tender.id },
        data: {
          matchScore:    result.score,
          matchKeywords: result.matchedKeywords,
        },
      })
      processed++
    } catch (err) {
      console.error(`[match] Failed to score tender ${tender.id}:`, err)
    }
  }

  console.log(`[match] Scored ${processed}/${pending.length} tender(s)`)
  return { processed }
}

// Also reset matchScore when a tender is updated (called from repository upsert)
export async function resetMatchScore(tenderId: string): Promise<void> {
  await prisma.tender.update({
    where: { id: tenderId },
    data: { matchScore: null, matchKeywords: [] },
  })
}
