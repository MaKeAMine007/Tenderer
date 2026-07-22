import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [tenders, runs] = await Promise.all([
      prisma.tender.findMany({
        select: {
          portal: true,
          state: true,
          department: true,
          isRelevant: true,
          documentStatus: true,
          relevanceStatus: true,
          createdAt: true,
        },
      }),
      prisma.scraperRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 30,
        select: {
          startedAt: true,
          totalNew: true,
          totalFetched: true,
          status: true,
        },
      }),
    ])

    // Aggregate by portal
    const byPortal: Record<string, number> = {}
    const byState: Record<string, number> = {}
    const byDept: Record<string, number> = {}

    let relevantCount = 0
    let docSuccessCount = 0
    let aiSuccessCount = 0
    let aiTotal = 0

    for (const t of tenders) {
      byPortal[t.portal] = (byPortal[t.portal] ?? 0) + 1
      byState[t.state] = (byState[t.state] ?? 0) + 1
      byDept[t.department] = (byDept[t.department] ?? 0) + 1
      if (t.isRelevant) relevantCount++
      if (t.documentStatus === 'COMPLETED') docSuccessCount++
      if (t.relevanceStatus === 'COMPLETED') { aiSuccessCount++; aiTotal++ }
      else if (t.relevanceStatus === 'FAILED') aiTotal++
    }

    const total = tenders.length

    // Top 10 departments
    const topDepts = Object.entries(byDept)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    const portalList = Object.entries(byPortal)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }))

    const stateList = Object.entries(byState)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([name, count]) => ({ name, count }))

    // Daily scrapes (last 30 days)
    const dailyScrapes = runs.map((r) => ({
      date: r.startedAt.toISOString().slice(0, 10),
      fetched: r.totalFetched,
      newCount: r.totalNew,
      status: r.status,
    }))

    return NextResponse.json({
      total,
      byPortal: portalList,
      byState: stateList,
      byDepartment: topDepts,
      relevantPercent: total > 0 ? Math.round((relevantCount / total) * 100) : 0,
      documentSuccessPercent: total > 0 ? Math.round((docSuccessCount / total) * 100) : 0,
      aiSuccessPercent: aiTotal > 0 ? Math.round((aiSuccessCount / aiTotal) * 100) : 0,
      dailyScrapes,
    })
  } catch (err) {
    console.error('GET /api/analytics failed:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
