import { prisma } from '@/lib/prisma'
import { ParsedTender } from '@/types'

export type UpsertResult = 'created' | 'updated' | 'skipped'

export async function upsertTender(
  data: ParsedTender & { dedupeKey: string }
): Promise<{ result: UpsertResult }> {
  const existing = await prisma.tender.findUnique({
    where: { dedupeKey: data.dedupeKey },
  })

  if (!existing) {
    await prisma.tender.create({
      data: {
        dedupeKey:    data.dedupeKey,
        portal:       data.portal,
        tenderNumber: data.tenderNumber ?? null,
        title:        data.title,
        department:   data.department,
        state:        data.state,
        publishedDate: data.publishedDate ?? null,
        closingDate:  data.closingDate ?? null,
        budget:       data.budget ?? null,
        emd:          data.emd ?? null,
        description:  data.description ?? null,
        pdfUrl:       data.pdfUrl ?? null,
        sourceUrl:    data.sourceUrl,
        rawHtml:      data.rawHtml ?? null,
      },
    })
    return { result: 'created' }
  }

  const hasChanged =
    existing.title      !== data.title      ||
    existing.department !== data.department ||
    existing.budget     !== (data.budget ?? null) ||
    existing.closingDate?.toISOString() !== (data.closingDate?.toISOString() ?? null)

  if (!hasChanged) return { result: 'skipped' }

  await prisma.tender.update({
    where: { dedupeKey: data.dedupeKey },
    data: {
      title:        data.title,
      department:   data.department,
      state:        data.state,
      publishedDate: data.publishedDate ?? null,
      closingDate:  data.closingDate ?? null,
      budget:       data.budget ?? null,
      emd:          data.emd ?? null,
      description:  data.description ?? null,
      pdfUrl:       data.pdfUrl ?? null,
      sourceUrl:    data.sourceUrl,
      rawHtml:      data.rawHtml ?? null,
      // Reset all processing pipelines on content change
      documentStatus:          'PENDING',
      documentText:            null,
      documentProcessedAt:     null,
      documentError:           null,
      relevanceStatus:         'PENDING',
      isRelevant:              null,
      relevanceScore:          null,
      relevanceReason:         null,
      relevanceModel:          null,
      relevanceProvider:       null,
      relevanceCheckedAt:      null,
      relevanceError:          null,
      matchScore:              null,
      matchKeywords:           [],
      aiSummary:               null,
      positiveFactors:         [],
      risks:                   [],
      missingInfo:             [],
      eligibilityStatus:       null,
      eligibilityScore:        null,
      eligibilityNotes:        null,
      eligibilityAt:           null,
      aiLayer2Status:          null,
      aiLayer2Summary:         null,
      aiLayer2Deliverables:    [],
      aiLayer2Qualifications:  [],
      aiLayer2Concerns:        [],
      aiLayer2Effort:          null,
      aiLayer2Difficulty:      null,
      aiLayer2NextAction:      null,
      aiLayer2At:              null,
      recommendation:          null,
      confidence:              null,
      nextStep:                null,
      intelligenceAt:          null,
    },
  })
  return { result: 'updated' }
}

export async function getAllTenders() {
  return prisma.tender.findMany({
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      portal: true,
      tenderNumber: true,
      title: true,
      department: true,
      state: true,
      publishedDate: true,
      closingDate: true,
      budget: true,
      emd: true,
      description: true,
      pdfUrl: true,
      sourceUrl: true,
      status: true,
      documentStatus: true,
      documentSource: true,
      relevanceStatus: true,
      isRelevant: true,
      relevanceScore: true,
      relevanceReason: true,
      matchScore: true,
      matchKeywords: true,
      entryScore: true,
      entryLevel: true,
      entrySignals: true,
      aiSummary: true,
      positiveFactors: true,
      risks: true,
      missingInfo: true,
      whyWeCanWin: true,
      eligibilityStatus: true,
      eligibilityScore: true,
      eligibilityNotes: true,
      aiLayer2Status: true,
      aiLayer2Summary: true,
      aiLayer2Deliverables: true,
      aiLayer2Qualifications: true,
      aiLayer2Concerns: true,
      aiLayer2Effort: true,
      aiLayer2Difficulty: true,
      aiLayer2NextAction: true,
      recommendation: true,
      confidence: true,
      nextStep: true,
      intelligenceAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getTenderById(id: string) {
  return prisma.tender.findUnique({ where: { id } })
}

export async function markTenderViewed(id: string) {
  return prisma.tender.update({
    where: { id },
    data: { status: 'VIEWED' },
  })
}

export async function getPendingDocumentTenders(limit: number) {
  return prisma.tender.findMany({
    where: { documentStatus: 'PENDING' },
    select: { id: true, pdfUrl: true, rawHtml: true, description: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

type DocStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW'

export async function updateDocumentFields(
  id: string,
  data: {
    documentStatus:       DocStatus
    documentText?:        string | null
    documentSource?:      string
    documentProcessedAt?: Date
    documentError?:       string | null
  }
) {
  return prisma.tender.update({ where: { id }, data })
}

// Minimum matchScore required before a tender is sent to AI Layer 1.
// Tenders below this are marked SKIPPED to prevent permanent PENDING accumulation.
const MIN_AI_MATCH_SCORE = parseInt(process.env.MIN_AI_MATCH_SCORE ?? '30')

export async function getPendingRelevanceTenders(limit: number) {
  return prisma.tender.findMany({
    where: {
      relevanceStatus: 'PENDING',
      matchScore: { gte: MIN_AI_MATCH_SCORE },
    },
    select: { id: true },
    orderBy: [
      { matchScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
  })
}

// Mark all PENDING tenders below the match threshold as SKIPPED so they
// don't accumulate as permanent PENDING items in the AI queue.
export async function skipLowScoreTenders(): Promise<number> {
  const result = await prisma.tender.updateMany({
    where: {
      relevanceStatus: 'PENDING',
      matchScore: { lt: MIN_AI_MATCH_SCORE, not: null },
    },
    data: { relevanceStatus: 'SKIPPED' },
  })
  return result.count
}

// Reset tenders stuck in PROCESSING back to PENDING so they get retried.
// Called at pipeline start to recover from mid-run crashes.
export async function resetStuckProcessingStates(): Promise<{ docs: number; relevance: number; layer2: number }> {
  const [docs, relevance, layer2] = await Promise.all([
    prisma.tender.updateMany({
      where: { documentStatus: 'PROCESSING' },
      data: { documentStatus: 'PENDING' },
    }),
    prisma.tender.updateMany({
      where: { relevanceStatus: 'PROCESSING' },
      data: { relevanceStatus: 'PENDING' },
    }),
    prisma.tender.updateMany({
      where: { aiLayer2Status: 'PROCESSING' },
      data: { aiLayer2Status: 'PENDING' },
    }),
  ])
  return { docs: docs.count, relevance: relevance.count, layer2: layer2.count }
}

type RelevanceStatusVal = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'

export async function updateRelevanceFields(
  id: string,
  data: {
    relevanceStatus:    RelevanceStatusVal
    isRelevant?:        boolean | null
    relevanceScore?:    number | null
    relevanceReason?:   string | null
    relevanceModel?:    string | null
    relevanceProvider?: string | null
    relevanceCheckedAt?: Date | null
    relevanceError?:    string | null
  }
) {
  return prisma.tender.update({ where: { id }, data })
}

export async function updateIntelligenceFields(
  id: string,
  data: {
    matchScore?:       number | null
    matchKeywords?:    string[]
    aiSummary?:        string | null
    positiveFactors?:  string[]
    risks?:            string[]
    missingInfo?:      string[]
    whyWeCanWin?:      string[]
    recommendation?:   'PURSUE' | 'MAYBE' | 'DO_NOT_PURSUE' | null
    confidence?:       number | null
    nextStep?:         string | null
    intelligenceAt?:   Date | null
  }
) {
  return prisma.tender.update({ where: { id }, data })
}

export async function getTenderStats() {
  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const weekEnd = new Date(now)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [
    total,
    viewed,
    active,
    expired,
    pursue,
    maybe,
    relevant,
    pendingAI,
    aiFailed,
    eligible,
    closingToday,
    closingThisWeek,
    lastRun,
  ] = await Promise.all([
    prisma.tender.count(),
    prisma.tender.count({ where: { status: 'VIEWED' } }),
    prisma.tender.count({ where: { closingDate: { gte: now } } }),
    prisma.tender.count({ where: { closingDate: { lt: now } } }),
    prisma.tender.count({ where: { recommendation: 'PURSUE' } }),
    prisma.tender.count({ where: { recommendation: 'MAYBE' } }),
    prisma.tender.count({ where: { isRelevant: true } }),
    prisma.tender.count({ where: { relevanceStatus: { in: ['PENDING', 'PROCESSING'] } } }),
    prisma.tender.count({ where: { relevanceStatus: 'FAILED' } }),
    prisma.tender.count({ where: { eligibilityStatus: { in: ['ELIGIBLE', 'LIKELY_ELIGIBLE'] } } }),
    prisma.tender.count({ where: { closingDate: { gte: now, lte: todayEnd } } }),
    prisma.tender.count({ where: { closingDate: { gte: now, lte: weekEnd } } }),
    prisma.scraperRun.findFirst({
      where: { status: { in: ['SUCCESS', 'PARTIAL_SUCCESS'] } },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
  ])

  return {
    total,
    newCount: total - viewed,
    viewed,
    active,
    expired,
    pursue,
    maybe,
    relevant,
    pendingAI,
    aiFailed,
    eligible,
    closingToday,
    closingThisWeek,
    lastSchedulerRun: lastRun?.completedAt ?? null,
  }
}
