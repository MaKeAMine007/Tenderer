import { ParsedTender, ScraperResult } from '@/types'
import * as repo from '@/repositories/tender.repository'

export function computeDedupeKey(tender: ParsedTender): string {
  if (tender.tenderNumber?.trim()) return `tn::${tender.tenderNumber.trim()}`
  const parts = [
    tender.title.trim().toLowerCase().slice(0, 100),
    tender.department.trim().toLowerCase(),
    tender.closingDate?.toISOString() ?? 'no-close',
  ]
  return `composite::${parts.join('|')}`
}

export async function saveTenders(
  tenders: ParsedTender[],
  portal: string
): Promise<Pick<ScraperResult, 'newCount' | 'updated' | 'skipped' | 'failed'>> {
  let newCount = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  for (const tender of tenders) {
    const dedupeKey = computeDedupeKey(tender)
    try {
      const { result } = await repo.upsertTender({ ...tender, dedupeKey })
      if (result === 'created') newCount++
      else if (result === 'updated') updated++
      else skipped++
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `[saveTenders][${portal}] Failed to save "${tender.title.slice(0, 60)}": ${msg}`
      )
    }
  }

  return { newCount, updated, skipped, failed }
}

export async function getAllTenders() {
  return repo.getAllTenders()
}

export async function getTenderById(id: string) {
  return repo.getTenderById(id)
}

export async function markTenderViewed(id: string) {
  return repo.markTenderViewed(id)
}

export async function getTenderStats() {
  return repo.getTenderStats()
}
