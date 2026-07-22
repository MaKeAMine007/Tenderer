import { fetchAndExtractPdf } from './pdf.service'
import { extractTextFromHtml } from './html.service'
import * as repo from '@/repositories/tender.repository'

const BATCH_SIZE = parseInt(process.env.DOCUMENT_BATCH_SIZE ?? '20')
const CONCURRENCY = parseInt(process.env.DOCUMENT_CONCURRENCY ?? '3')

export interface DocumentProcessingResult {
  processed: number
  succeeded: number
  failed: number
  needsReview: number
}

export async function processPendingDocuments(): Promise<DocumentProcessingResult> {
  const tenders = await repo.getPendingDocumentTenders(BATCH_SIZE)

  if (tenders.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, needsReview: 0 }
  }

  console.log(`[doc] Processing ${tenders.length} pending tender(s)`)

  let succeeded = 0
  let failed = 0
  let needsReview = 0

  for (let i = 0; i < tenders.length; i += CONCURRENCY) {
    const batch = tenders.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(batch.map((t) => processSingleTender(t)))
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        if (r.value === 'COMPLETED') succeeded++
        else if (r.value === 'NEEDS_REVIEW') needsReview++
        else failed++
      } else {
        failed++
      }
    })
  }

  console.log(
    `[doc] Done — succeeded: ${succeeded}, needsReview: ${needsReview}, failed: ${failed}`
  )

  return { processed: tenders.length, succeeded, failed, needsReview }
}

type ProcessOutcome = 'COMPLETED' | 'NEEDS_REVIEW' | 'FAILED'

async function processSingleTender(tender: {
  id: string
  pdfUrl: string | null
  rawHtml: string | null
  description: string | null
}): Promise<ProcessOutcome> {
  await repo.updateDocumentFields(tender.id, { documentStatus: 'PROCESSING' })

  const wallStart = Date.now()

  try {
    let documentText: string | null = null
    let documentSource = 'none'

    // Priority 1: PDF
    if (tender.pdfUrl) {
      try {
        const pdf = await fetchAndExtractPdf(tender.pdfUrl)
        const normalized = normalizeText(pdf.text)
        if (normalized.length >= 50) {
          documentText = normalized
          documentSource = 'pdf'
          console.log(
            `[doc] ${tender.id} PDF ok — ${pdf.pages}p, ${pdf.durationMs}ms, ${normalized.length} chars`
          )
        } else {
          console.warn(`[doc] ${tender.id} PDF extracted but text too short (${normalized.length} chars)`)
        }
      } catch (pdfErr) {
        const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr)
        console.warn(`[doc] ${tender.id} PDF failed (${msg}) — falling back`)
      }
    }

    // Priority 2: description field
    if (!documentText && tender.description?.trim()) {
      const normalized = normalizeText(tender.description)
      if (normalized.length >= 20) {
        documentText = normalized
        documentSource = 'description'
      }
    }

    // Priority 3: rawHtml — table row HTML, minimal value but better than nothing
    if (!documentText && tender.rawHtml?.trim()) {
      const extracted = extractTextFromHtml(tender.rawHtml)
      if (extracted.length >= 30) {
        documentText = extracted
        documentSource = 'html'
      }
    }

    const status: ProcessOutcome = documentText ? 'COMPLETED' : 'NEEDS_REVIEW'

    await repo.updateDocumentFields(tender.id, {
      documentStatus: status,
      documentText: documentText ?? null,
      documentSource: documentSource,
      documentProcessedAt: new Date(),
      documentError: null,
    })

    console.log(
      `[doc] ${tender.id} → ${status} (source: ${documentSource}, ${Date.now() - wallStart}ms)`
    )

    return status
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[doc] ${tender.id} fatal error: ${msg}`)

    await repo.updateDocumentFields(tender.id, {
      documentStatus: 'FAILED',
      documentProcessedAt: new Date(),
      documentError: msg,
    })

    return 'FAILED'
  }
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{3,}/g, '  ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}
