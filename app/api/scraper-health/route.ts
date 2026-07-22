import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface PortalResult {
  portal: string
  fetched: number
  newCount: number
  updated: number
  errors: string[]
  warnings: string[]
  durationMs: number
}

interface PortalHealth {
  portal: string
  totalRuns: number
  successfulRuns: number
  successRate: number
  lastSuccess: string | null
  lastFailure: string | null
  avgDurationMs: number
  totalFetched: number
  totalNew: number
  // Business metrics
  totalTenders: number
  relevantTenders: number
  pursue: number
  maybe: number
  pass: number
  pendingAI: number
  avgMatchScore: number | null
  avgConfidence: number | null
}

export async function GET() {
  try {
    const [runs, tenderStats] = await Promise.all([
      prisma.scraperRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 100,
        select: {
          startedAt: true,
          completedAt: true,
          status: true,
          perPortalResults: true,
        },
      }),
      // Aggregate business metrics per portal
      prisma.tender.groupBy({
        by: ['portal'],
        _count: { id: true },
        _avg: { matchScore: true, confidence: true },
      }),
    ])

    // Per-portal recommendation counts
    const recCounts = await prisma.tender.groupBy({
      by: ['portal', 'recommendation'],
      _count: { id: true },
    })

    const relevantCounts = await prisma.tender.groupBy({
      by: ['portal'],
      where: { isRelevant: true },
      _count: { id: true },
    })

    const pendingAICounts = await prisma.tender.groupBy({
      by: ['portal'],
      where: { relevanceStatus: { in: ['PENDING', 'PROCESSING'] } },
      _count: { id: true },
    })

    // Build business metrics map
    const bizMap: Record<string, {
      totalTenders: number
      relevantTenders: number
      pursue: number
      maybe: number
      pass: number
      pendingAI: number
      avgMatchScore: number | null
      avgConfidence: number | null
    }> = {}

    for (const s of tenderStats) {
      bizMap[s.portal] = {
        totalTenders: s._count.id,
        relevantTenders: 0,
        pursue: 0,
        maybe: 0,
        pass: 0,
        pendingAI: 0,
        avgMatchScore: s._avg.matchScore !== null ? Math.round(s._avg.matchScore) : null,
        avgConfidence: s._avg.confidence !== null ? Math.round(s._avg.confidence) : null,
      }
    }

    for (const r of recCounts) {
      if (!bizMap[r.portal]) continue
      const rec = r.recommendation
      if (rec === 'PURSUE')        bizMap[r.portal].pursue += r._count.id
      else if (rec === 'MAYBE')    bizMap[r.portal].maybe += r._count.id
      else if (rec === 'DO_NOT_PURSUE') bizMap[r.portal].pass += r._count.id
    }

    for (const r of relevantCounts) {
      if (bizMap[r.portal]) bizMap[r.portal].relevantTenders = r._count.id
    }

    for (const r of pendingAICounts) {
      if (bizMap[r.portal]) bizMap[r.portal].pendingAI = r._count.id
    }

    const healthMap: Record<string, {
      totalRuns: number
      successfulRuns: number
      durations: number[]
      totalFetched: number
      totalNew: number
      lastSuccess: string | null
      lastFailure: string | null
    }> = {}

    for (const run of runs) {
      const portals = run.perPortalResults as PortalResult[] | null
      if (!portals) continue

      for (const p of portals) {
        if (!healthMap[p.portal]) {
          healthMap[p.portal] = {
            totalRuns: 0,
            successfulRuns: 0,
            durations: [],
            totalFetched: 0,
            totalNew: 0,
            lastSuccess: null,
            lastFailure: null,
          }
        }

        const h = healthMap[p.portal]
        h.totalRuns++
        h.totalFetched += p.fetched
        h.totalNew += p.newCount
        if (p.durationMs) h.durations.push(p.durationMs)

        const ts = run.startedAt.toISOString()
        if (p.errors.length === 0) {
          h.successfulRuns++
          if (!h.lastSuccess) h.lastSuccess = ts
        } else {
          if (!h.lastFailure) h.lastFailure = ts
        }
      }
    }

    // Merge all portals (may appear in scraper runs but not in tender DB, or vice versa)
    const allPortals = new Set([...Object.keys(healthMap), ...Object.keys(bizMap)])

    const portals: PortalHealth[] = Array.from(allPortals).map((portal) => {
      const h = healthMap[portal]
      const b = bizMap[portal]
      return {
        portal,
        totalRuns: h?.totalRuns ?? 0,
        successfulRuns: h?.successfulRuns ?? 0,
        successRate: h && h.totalRuns > 0 ? Math.round((h.successfulRuns / h.totalRuns) * 100) : 0,
        lastSuccess: h?.lastSuccess ?? null,
        lastFailure: h?.lastFailure ?? null,
        avgDurationMs: h && h.durations.length > 0
          ? Math.round(h.durations.reduce((a, b) => a + b, 0) / h.durations.length)
          : 0,
        totalFetched: h?.totalFetched ?? 0,
        totalNew: h?.totalNew ?? 0,
        totalTenders: b?.totalTenders ?? 0,
        relevantTenders: b?.relevantTenders ?? 0,
        pursue: b?.pursue ?? 0,
        maybe: b?.maybe ?? 0,
        pass: b?.pass ?? 0,
        pendingAI: b?.pendingAI ?? 0,
        avgMatchScore: b?.avgMatchScore ?? null,
        avgConfidence: b?.avgConfidence ?? null,
      }
    }).sort((a, b) => a.portal.localeCompare(b.portal))

    return NextResponse.json({ portals })
  } catch (err) {
    console.error('GET /api/scraper-health failed:', err)
    return NextResponse.json({ error: 'Failed to fetch scraper health' }, { status: 500 })
  }
}
