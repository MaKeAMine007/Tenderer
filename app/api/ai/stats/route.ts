import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      total,
      completed,
      relevant,
      notRelevant,
      failed,
      pending,
      processing,
      modelSample,
    ] = await Promise.all([
      prisma.tender.count(),
      prisma.tender.count({ where: { relevanceStatus: 'COMPLETED' } }),
      prisma.tender.count({ where: { isRelevant: true } }),
      prisma.tender.count({ where: { isRelevant: false } }),
      prisma.tender.count({ where: { relevanceStatus: 'FAILED' } }),
      prisma.tender.count({ where: { relevanceStatus: 'PENDING' } }),
      prisma.tender.count({ where: { relevanceStatus: 'PROCESSING' } }),
      prisma.tender.findFirst({
        where: { relevanceStatus: 'COMPLETED' },
        orderBy: { relevanceCheckedAt: 'desc' },
        select: { relevanceModel: true, relevanceProvider: true, relevanceCheckedAt: true },
      }),
    ])

    const successRate = completed > 0 ? Math.round((completed / (completed + failed)) * 100) : 0
    const relevantRate = completed > 0 ? Math.round((relevant / completed) * 100) : 0

    return NextResponse.json({
      total,
      completed,
      relevant,
      notRelevant,
      failed,
      pending,
      processing,
      successRate,
      relevantRate,
      provider: modelSample?.relevanceProvider ?? (process.env.AI_PROVIDER ?? 'gemini'),
      model: modelSample?.relevanceModel ?? (process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'),
      lastRun: modelSample?.relevanceCheckedAt?.toISOString() ?? null,
      configured: !!process.env.GEMINI_API_KEY,
    })
  } catch (err) {
    console.error('GET /api/ai/stats failed:', err)
    return NextResponse.json({ error: 'Failed to fetch AI stats' }, { status: 500 })
  }
}
