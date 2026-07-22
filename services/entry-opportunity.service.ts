/**
 * Entry Opportunity Engine
 *
 * Deterministic assessment of how suitable a tender is for a company
 * that is entering the government tender market for the first time.
 *
 * Detects favourable signals:
 *  - MSME / Startup India preference
 *  - No prior government experience required
 *  - Open / low turnover requirements
 *  - Digital transformation / IT / software tenders
 *  - Reasonable EMD and contract size
 *  - Non-complex eligibility criteria
 *
 * Generates: entryScore (0-100), entryLevel (HIGH/MEDIUM/LOW), entrySignals[]
 *
 * No AI calls — fast and deterministic.
 */

import { prisma } from '@/lib/prisma'

const BATCH_SIZE = parseInt(process.env.ENTRY_BATCH_SIZE ?? '50')

export type EntryLevel = 'HIGH' | 'MEDIUM' | 'LOW'

export interface EntryOpportunityResult {
  score:   number
  level:   EntryLevel
  signals: string[]
}

export interface EntryEngineResult {
  processed: number
  high:      number
  medium:    number
  low:       number
}

// ── Signal detectors ──────────────────────────────────────────────────────────

interface TenderForEntry {
  id:           string
  title:        string
  department:   string
  state:        string
  description:  string | null
  documentText: string | null
  budget:       string | null
  emd:          string | null
  matchScore:   number | null
}

function buildText(tender: TenderForEntry): string {
  return [tender.title, tender.department, tender.description, tender.documentText]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const CRORE = 10_000_000
const LAKH  = 100_000

function parseBudgetINR(raw: string | null): number | null {
  if (!raw) return null
  const s = raw.replace(/,/g, '').toLowerCase().replace(/₹|rs\.?|inr/gi, '').trim()
  const crore = s.match(/([\d.]+)\s*cr(?:ore)?/i)
  if (crore) return parseFloat(crore[1]) * CRORE
  const lakh = s.match(/([\d.]+)\s*(?:lakh?|lac?|l)\b/i)
  if (lakh) return parseFloat(lakh[1]) * LAKH
  const num = parseFloat(s.replace(/[^\d.]/g, ''))
  return isNaN(num) ? null : num
}

// ── Individual signal checks ──────────────────────────────────────────────────

function detectMsme(text: string): string | null {
  if (/msme|micro.*small.*medium|small.*enterprise|udyam/i.test(text))
    return 'MSME / small enterprise preference mentioned'
  return null
}

function detectStartup(text: string): string | null {
  if (/startup\s*india|start[- ]?up|dpiit/i.test(text))
    return 'Startup India eligible'
  return null
}

function detectNoExperience(text: string): string | null {
  if (/no.*prior.*experience|experience.*not.*mandatory|experience.*not.*required|open.*to.*all.*eligible/i.test(text))
    return 'No prior government experience required'
  if (/minimum.*experience.*nil|experience.*0\s*year/i.test(text))
    return 'Zero experience requirement stated'
  return null
}

function detectLowTurnover(text: string): string | null {
  // Look for low turnover requirements (under ₹1 Cr)
  const croreMatch = text.match(/annual\s+turnover.{0,50}?([\d.]+)\s*cr(?:ore)?/i)
  if (croreMatch) {
    const crores = parseFloat(croreMatch[1])
    if (crores <= 1) return `Low turnover requirement: ₹${croreMatch[1]} Cr`
    return null
  }
  const lakhMatch = text.match(/annual\s+turnover.{0,50}?([\d.]+)\s*lakh/i)
  if (lakhMatch) {
    const lakhs = parseFloat(lakhMatch[1])
    if (lakhs <= 50) return `Low turnover requirement: ₹${lakhMatch[1]} L`
    return null
  }
  return null
}

function detectDigitalProject(text: string): string | null {
  const digitalTerms = [
    'website', 'web portal', 'web application', 'mobile app', 'software development',
    'erp', 'crm', 'dashboard', 'digital marketing', 'seo', 'branding', 'ui/ux',
    'content management', 'lms', 'e-governance', 'smart city', 'it solution',
    'information technology', 'automation', 'analytics', 'ai solution',
    'digital transformation', 'video production', 'graphic design',
  ]
  const matched = digitalTerms.filter((t) => text.includes(t))
  if (matched.length >= 2) return `Core digital/IT project (${matched.slice(0, 3).join(', ')})`
  if (matched.length === 1) return `IT/digital project (${matched[0]})`
  return null
}

function detectReasonableEmd(emdRaw: string | null, budgetRaw: string | null): string | null {
  const emd = parseBudgetINR(emdRaw)
  if (!emd) return null
  if (emd <= 200_000) return `Low EMD: ₹${(emd / 1000).toFixed(0)}K — accessible entry point`
  const budget = parseBudgetINR(budgetRaw)
  if (budget && emd / budget <= 0.025) return 'EMD is ≤2.5% of contract value — reasonable'
  return null
}

function detectSmallContract(budgetRaw: string | null): string | null {
  const budget = parseBudgetINR(budgetRaw)
  if (!budget) return null
  if (budget <= 3_000_000) return `Small contract (₹${(budget / LAKH).toFixed(0)}L) — within startup capacity`
  if (budget <= 10_000_000) return `Medium contract (₹${(budget / LAKH).toFixed(0)}L) — manageable scope`
  return null
}

function detectOpenEligibility(text: string): string | null {
  if (/open\s+to\s+all|any\s+(?:eligible\s+)?(?:firm|company|agency)|no\s+specific\s+qualification/i.test(text))
    return 'Open eligibility — no specific pre-qualification'
  if (/all\s+interested\s+(?:firms|vendors|agencies)/i.test(text))
    return 'All interested firms eligible'
  return null
}

function detectJointVenture(text: string): string | null {
  if (/joint\s+venture|consortium|jv\s+allowed|jv\s+eligible/i.test(text))
    return 'JV / consortium allowed — can partner to meet criteria'
  return null
}

// ── Core scoring ──────────────────────────────────────────────────────────────

export function assessEntryOpportunity(tender: TenderForEntry): EntryOpportunityResult {
  const text    = buildText(tender)
  const signals: string[] = []

  // Run all detectors
  const checks = [
    detectMsme(text),
    detectStartup(text),
    detectNoExperience(text),
    detectLowTurnover(text),
    detectDigitalProject(text),
    detectReasonableEmd(tender.emd, tender.budget),
    detectSmallContract(tender.budget),
    detectOpenEligibility(text),
    detectJointVenture(text),
  ]

  checks.forEach((c) => { if (c) signals.push(c) })

  // Score calculation
  // Each signal adds weight; some signals are more significant
  let score = 0

  if (detectDigitalProject(text))    score += 30  // core capability match
  if (detectMsme(text))              score += 15  // preference for smaller firms
  if (detectStartup(text))           score += 15  // startup eligible
  if (detectNoExperience(text))      score += 20  // no experience barrier
  if (detectLowTurnover(text))       score += 10  // financial barrier low
  if (detectOpenEligibility(text))   score += 10  // no pre-qual needed
  if (detectSmallContract(tender.budget)) score += 10  // manageable size
  if (detectReasonableEmd(tender.emd, tender.budget)) score += 5
  if (detectJointVenture(text))      score += 5

  // Adjust by match score (tender relevance to MAM's services)
  if (tender.matchScore !== null) {
    const matchBonus = Math.round(tender.matchScore * 0.1)  // up to 10 bonus pts
    score = Math.min(100, score + matchBonus)
  }

  score = Math.min(100, score)

  const level: EntryLevel =
    score >= 60 ? 'HIGH' :
    score >= 35 ? 'MEDIUM' :
                  'LOW'

  return { score, level, signals }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

export async function runEntryOpportunityEngine(): Promise<EntryEngineResult> {
  const pending = await prisma.tender.findMany({
    where: { entryScore: null },
    select: {
      id:           true,
      title:        true,
      department:   true,
      state:        true,
      description:  true,
      documentText: true,
      budget:       true,
      emd:          true,
      matchScore:   true,
    },
    take: BATCH_SIZE,
  })

  if (pending.length === 0) return { processed: 0, high: 0, medium: 0, low: 0 }

  console.log(`[entry] Assessing ${pending.length} tender(s)`)

  let high = 0, medium = 0, low = 0

  for (const tender of pending) {
    try {
      const result = assessEntryOpportunity(tender)
      await prisma.tender.update({
        where: { id: tender.id },
        data: {
          entryScore:   result.score,
          entryLevel:   result.level,
          entrySignals: result.signals,
        },
      })
      if (result.level === 'HIGH')   high++
      else if (result.level === 'MEDIUM') medium++
      else low++
    } catch (err) {
      console.error(`[entry] Failed for ${tender.id}:`, err)
    }
  }

  console.log(`[entry] Done — high:${high} medium:${medium} low:${low}`)
  return { processed: pending.length, high, medium, low }
}
