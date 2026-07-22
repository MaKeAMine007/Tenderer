/**
 * Eligibility Engine
 *
 * Deterministic assessment of whether MAM (a digital services / tech company)
 * can realistically bid on a given tender.
 *
 * No AI calls — purely text extraction + rule matching against the company profile.
 *
 * Verdict:
 *   ELIGIBLE         — criteria extracted and MAM clearly meets them
 *   LIKELY_ELIGIBLE  — partial match, or criteria only partially visible
 *   UNKNOWN          — not enough information to make a call
 *   NOT_ELIGIBLE     — criteria extracted and MAM clearly does NOT meet them
 */

import { prisma } from '@/lib/prisma'
import { getCompanyProfile } from './company-profile.service'

const BATCH_SIZE = parseInt(process.env.ELIGIBILITY_BATCH_SIZE ?? '50')

export type EligibilityStatus = 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN' | 'NOT_ELIGIBLE'

export interface EligibilityFlags {
  turnover:       { status: 'OK' | 'FAIL' | 'UNKNOWN'; note: string }
  experience:     { status: 'OK' | 'FAIL' | 'UNKNOWN'; note: string }
  certifications: { status: 'OK' | 'FAIL' | 'UNKNOWN'; note: string }
  msme:           { status: 'OK' | 'NA' | 'UNKNOWN'; note: string }
  location:       { status: 'OK' | 'FAIL' | 'UNKNOWN'; note: string }
  teamSize:       { status: 'OK' | 'FAIL' | 'UNKNOWN'; note: string }
}

export interface EligibilityResult {
  status:  EligibilityStatus
  score:   number
  notes:   string
  flags:   EligibilityFlags
}

// ── Text extraction helpers ───────────────────────────────────────────────────

const CRORE = 10_000_000
const LAKH  = 100_000

function extractNumber(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const raw = parseFloat(m[1].replace(/,/g, ''))
      if (!isNaN(raw)) return raw
    }
  }
  return null
}

function extractTurnoverINR(text: string): number | null {
  const lakh = extractNumber(text, [
    /annual\s+turnover.{0,60}?(?:rs\.?|₹|inr)?\s*([\d.,]+)\s*lakh/i,
    /turnover.{0,40}?(?:rs\.?|₹)?\s*([\d.,]+)\s*lakh/i,
    /minimum\s+turnover.{0,40}?([\d.,]+)\s*lakh/i,
    /average\s+annual\s+turnover.{0,40}?([\d.,]+)\s*lakh/i,
  ])
  if (lakh !== null) return lakh * LAKH

  const crore = extractNumber(text, [
    /annual\s+turnover.{0,60}?(?:rs\.?|₹|inr)?\s*([\d.,]+)\s*cr(?:ore)?/i,
    /turnover.{0,40}?(?:rs\.?|₹)?\s*([\d.,]+)\s*cr(?:ore)?/i,
    /minimum\s+turnover.{0,40}?([\d.,]+)\s*cr(?:ore)?/i,
    /average\s+annual\s+turnover.{0,40}?([\d.,]+)\s*cr(?:ore)?/i,
  ])
  if (crore !== null) return crore * CRORE

  return null
}

function extractExperienceYears(text: string): number | null {
  return extractNumber(text, [
    /minimum\s+(?:experience|work\s+experience).{0,30}?(\d+)\s*year/i,
    /(\d+)\s+years?\s+of\s+(?:experience|relevant\s+experience)/i,
    /experience\s+of\s+(?:at\s+least\s+)?(\d+)\s+year/i,
    /at\s+least\s+(\d+)\s+years?/i,
  ])
}

function extractSimilarProjects(text: string): number | null {
  return extractNumber(text, [
    /(\d+)\s+(?:similar\s+)?(?:completed\s+)?projects?\s+(?:of\s+similar\s+nature|in\s+similar)/i,
    /successfully\s+completed\s+(?:at\s+least\s+)?(\d+)\s+similar/i,
    /minimum\s+(\d+)\s+(?:similar\s+)?projects?/i,
    /(\d+)\s+projects?\s+of\s+similar\s+nature/i,
  ])
}

// ── Flag assessors ────────────────────────────────────────────────────────────

function assessTurnover(text: string): EligibilityFlags['turnover'] {
  const required = extractTurnoverINR(text)

  if (required === null) {
    return { status: 'UNKNOWN', note: 'Turnover requirement not visible in tender' }
  }

  // MAM estimated annual turnover: ₹50L–₹2Cr for a 3-year-old digital agency
  const mamTurnoverEstimate = 10_000_000  // ₹1 Cr conservative estimate

  if (required <= mamTurnoverEstimate) {
    return {
      status: 'OK',
      note: `Requires ₹${(required / LAKH).toFixed(0)}L annual turnover — within estimated range`,
    }
  }

  if (required <= mamTurnoverEstimate * 2) {
    return {
      status: 'OK',
      note: `Requires ₹${(required / LAKH).toFixed(0)}L turnover — borderline, verify actual figures`,
    }
  }

  return {
    status: 'FAIL',
    note: `Requires ₹${(required / CRORE).toFixed(1)}Cr annual turnover — may exceed MAM's current turnover`,
  }
}

function assessExperience(text: string): EligibilityFlags['experience'] {
  const years    = extractExperienceYears(text)
  const projects = extractSimilarProjects(text)

  // Check for "no experience required" signals
  if (/no.*prior.*experience|experience.*not.*mandatory|experience.*not.*required|open.*to.*all/i.test(text)) {
    return { status: 'OK', note: 'No prior experience required — explicitly stated' }
  }

  if (years === null && projects === null) {
    return { status: 'UNKNOWN', note: 'Experience requirements not explicitly stated' }
  }

  const notes: string[] = []
  let fail = false

  if (years !== null) {
    // MAM has ~3 years in digital services
    if (years <= 3) {
      notes.push(`Requires ${years} years — MAM has ~3 years experience`)
    } else if (years <= 5) {
      notes.push(`Requires ${years} years — may need to demonstrate equivalent project portfolio`)
    } else {
      notes.push(`Requires ${years} years — exceeds MAM's current operating history`)
      fail = true
    }
  }

  if (projects !== null) {
    if (projects <= 3) {
      notes.push(`Requires ${projects} similar projects — achievable for MAM`)
    } else if (projects <= 7) {
      notes.push(`Requires ${projects} similar projects — may need to compile portfolio carefully`)
    } else {
      notes.push(`Requires ${projects} similar projects — may be challenging to demonstrate`)
      fail = true
    }
  }

  return { status: fail ? 'FAIL' : 'OK', note: notes.join('; ') }
}

function assessCertifications(text: string): EligibilityFlags['certifications'] {
  const lower = text.toLowerCase()

  // Check for certifications MAM may not have
  const riskyTerms: string[] = []
  if (/iso\s*14001/i.test(text)) riskyTerms.push('ISO 14001')
  if (/cmmi\s*level\s*[3-5]/i.test(text)) riskyTerms.push('CMMI Level 3+')
  if (/iso\s*27001/i.test(text)) riskyTerms.push('ISO 27001')
  if (/empanelment.*nic|nic.*empanelment/i.test(text)) riskyTerms.push('NIC empanelment')

  if (riskyTerms.length > 0) {
    return {
      status: 'UNKNOWN',
      note: `Requires ${riskyTerms.join(', ')} — verify if MAM holds these`,
    }
  }

  // Check for positive signals (certs MAM has)
  const hasMsme  = lower.includes('msme')
  const hasGst   = lower.includes('gst')
  const hasIso   = /iso\s*9001/i.test(text)
  const hasStartup = lower.includes('startup india') || lower.includes('dpiit')
  const hasPan   = lower.includes('pan')

  if (hasMsme || hasStartup) {
    return { status: 'OK', note: 'MSME/Startup preference — MAM is MSME and Startup India registered' }
  }

  if (hasGst || hasIso || hasPan) {
    return { status: 'OK', note: 'Standard certification requirements (GST/PAN/ISO 9001) — MAM compliant' }
  }

  return { status: 'UNKNOWN', note: 'No specific certification requirements identified' }
}

function assessMsme(text: string): EligibilityFlags['msme'] {
  const lower = text.toLowerCase()
  if (lower.includes('msme') || lower.includes('small enterprise') || lower.includes('startup india') || lower.includes('udyam')) {
    return { status: 'OK', note: 'MSME/Startup India preference — MAM is eligible' }
  }
  return { status: 'NA', note: 'No MSME preference mentioned' }
}

function assessLocation(text: string): EligibilityFlags['location'] {
  const profile = getCompanyProfile()

  const requiresRegistration = /registered\s+in\s+(?:the\s+)?(?:state\s+of\s+)?([A-Za-z\s]+)/i.exec(text)
  if (requiresRegistration) {
    const reqState = requiresRegistration[1].trim().toLowerCase()
    const inPreferred = profile.preferredStates.some(
      (s) => s.toLowerCase().includes(reqState) || reqState.includes(s.toLowerCase())
    )
    return {
      status: inPreferred ? 'OK' : 'UNKNOWN',
      note: `Requires registration in ${requiresRegistration[1].trim()} — verify MAM's registration`,
    }
  }

  return { status: 'OK', note: 'No restrictive location/registration requirement identified' }
}

function assessTeamSize(text: string): EligibilityFlags['teamSize'] {
  const staffMatch = /(\d+)\s+(?:no\.?\s+of\s+)?(?:key\s+)?(?:professional|personnel|staff|developer|designer|engineer)/i.exec(text)
  if (staffMatch) {
    const required = parseInt(staffMatch[1])
    const mamSize  = 20  // total team approximate
    if (required <= mamSize) {
      return { status: 'OK', note: `Requires ${required} staff — MAM team of ~${mamSize}` }
    }
    return {
      status: required <= mamSize * 1.5 ? 'UNKNOWN' : 'FAIL',
      note: `Requires ${required} staff — may strain MAM's team of ~${mamSize}`,
    }
  }

  return { status: 'UNKNOWN', note: 'Staffing requirements not explicitly stated' }
}

// ── Core assessment ───────────────────────────────────────────────────────────

interface TenderForEligibility {
  id:           string
  title:        string
  department:   string
  description:  string | null
  documentText: string | null
  budget:       string | null
  state:        string
}

export function assessEligibility(tender: TenderForEligibility): EligibilityResult {
  const text = [tender.title, tender.department, tender.description, tender.documentText]
    .filter(Boolean)
    .join('\n')

  const flags: EligibilityFlags = {
    turnover:       assessTurnover(text),
    experience:     assessExperience(text),
    certifications: assessCertifications(text),
    msme:           assessMsme(text),
    location:       assessLocation(text),
    teamSize:       assessTeamSize(text),
  }

  // ── Score calculation ──
  let score = 0
  let totalWeight = 0

  function scoreFlag(flag: { status: string }, weight: number) {
    totalWeight += weight
    if (flag.status === 'OK')      score += weight
    else if (flag.status === 'NA') { totalWeight -= weight }  // don't penalise N/A
    else if (flag.status === 'UNKNOWN') score += weight * 0.5
    // FAIL = 0
  }

  scoreFlag(flags.turnover,       30)
  scoreFlag(flags.experience,     25)
  scoreFlag(flags.certifications, 15)
  scoreFlag(flags.msme,           10)
  scoreFlag(flags.location,       10)
  scoreFlag(flags.teamSize,       10)

  const normalised = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 50

  // ── Verdict ──
  const failCount    = Object.values(flags).filter((f) => f.status === 'FAIL').length
  const unknownCount = Object.values(flags).filter((f) => f.status === 'UNKNOWN').length
  const okCount      = Object.values(flags).filter((f) => f.status === 'OK').length

  let status: EligibilityStatus
  if (failCount >= 2) {
    status = 'NOT_ELIGIBLE'
  } else if (failCount === 1) {
    status = 'UNKNOWN'
  } else if (unknownCount >= 3) {
    status = 'UNKNOWN'
  } else if (okCount >= 3 && unknownCount <= 1) {
    status = 'ELIGIBLE'
  } else {
    status = 'LIKELY_ELIGIBLE'
  }

  // Build human-readable notes
  const noteLines: string[] = []
  if (flags.turnover.status !== 'UNKNOWN')      noteLines.push(`Turnover: ${flags.turnover.note}`)
  if (flags.experience.status !== 'UNKNOWN')    noteLines.push(`Experience: ${flags.experience.note}`)
  if (flags.certifications.status !== 'UNKNOWN') noteLines.push(`Certs: ${flags.certifications.note}`)
  if (flags.msme.status === 'OK')               noteLines.push(flags.msme.note)
  if (flags.teamSize.status !== 'UNKNOWN')      noteLines.push(`Team: ${flags.teamSize.note}`)

  const notes = noteLines.length > 0
    ? noteLines.join(' | ')
    : 'Eligibility criteria not explicitly stated — likely eligible based on tender type'

  return { status, score: normalised, notes, flags }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

export interface EligibilityEngineResult {
  processed:   number
  eligible:    number
  likelyElig:  number
  unknown:     number
  notEligible: number
}

export async function runEligibilityEngine(): Promise<EligibilityEngineResult> {
  const pending = await prisma.tender.findMany({
    where: { eligibilityStatus: null },
    select: {
      id:           true,
      title:        true,
      department:   true,
      description:  true,
      documentText: true,
      budget:       true,
      state:        true,
    },
    take: BATCH_SIZE,
  })

  if (pending.length === 0) return { processed: 0, eligible: 0, likelyElig: 0, unknown: 0, notEligible: 0 }

  console.log(`[eligibility] Assessing ${pending.length} tender(s)`)

  let eligible = 0, likelyElig = 0, unknown = 0, notEligible = 0

  for (const tender of pending) {
    try {
      const result = assessEligibility(tender)
      await prisma.tender.update({
        where: { id: tender.id },
        data: {
          eligibilityStatus: result.status,
          eligibilityScore:  result.score,
          eligibilityNotes:  result.notes,
          eligibilityAt:     new Date(),
        },
      })
      if (result.status === 'ELIGIBLE')          eligible++
      else if (result.status === 'LIKELY_ELIGIBLE') likelyElig++
      else if (result.status === 'NOT_ELIGIBLE') notEligible++
      else unknown++
    } catch (err) {
      console.error(`[eligibility] Failed for ${tender.id}:`, err)
    }
  }

  console.log(`[eligibility] Done — eligible:${eligible} likely:${likelyElig} unknown:${unknown} notEligible:${notEligible}`)
  return { processed: pending.length, eligible, likelyElig, unknown, notEligible }
}
