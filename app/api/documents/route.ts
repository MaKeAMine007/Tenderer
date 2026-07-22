import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tenders = await prisma.tender.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        portal: true,
        department: true,
        pdfUrl: true,
        documentStatus: true,
        documentSource: true,
        documentProcessedAt: true,
        documentError: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const docs = tenders.map((t) => ({
      id: t.id,
      title: t.title,
      portal: t.portal,
      department: t.department,
      pdfUrl: t.pdfUrl,
      documentStatus: t.documentStatus,
      documentSource: t.documentSource,
      documentProcessedAt: t.documentProcessedAt?.toISOString() ?? null,
      documentError: t.documentError,
      processingMs: t.documentProcessedAt
        ? t.documentProcessedAt.getTime() - t.createdAt.getTime()
        : null,
      updatedAt: t.updatedAt.toISOString(),
    }))

    const statusCounts = {
      PENDING: docs.filter((d) => d.documentStatus === 'PENDING').length,
      PROCESSING: docs.filter((d) => d.documentStatus === 'PROCESSING').length,
      COMPLETED: docs.filter((d) => d.documentStatus === 'COMPLETED').length,
      FAILED: docs.filter((d) => d.documentStatus === 'FAILED').length,
      NEEDS_REVIEW: docs.filter((d) => d.documentStatus === 'NEEDS_REVIEW').length,
    }

    return NextResponse.json({ documents: docs, statusCounts, total: docs.length })
  } catch (err) {
    console.error('GET /api/documents failed:', err)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
