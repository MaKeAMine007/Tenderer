import { ParsedTender } from '@/types'
import {
  stripTags,
  parseIndianDate,
  normalizeCurrency,
  buildHeaderMap,
  resolveColumn,
  extractPdfUrl,
  extractSourceUrl,
  isValidTender,
} from '../utils/normalize'

export function parseHtml(html: string, baseUrl: string): ParsedTender[] {
  const colMap = buildHeaderMap(html)
  const hasHeaders = Object.keys(colMap).length > 0

  const col = (cells: string[], field: string, fallback: number): string => {
    if (hasHeaders) return cells[resolveColumn(colMap, field)] ?? ''
    return cells[fallback] ?? ''
  }

  const results: ParsedTender[] = []
  const rowRegex = /<tr[^>]*class="[^"]*DataRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1]
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripTags(m[1])
    )

    if (cells.length < 5) continue

    const tender: ParsedTender = {
      portal: 'CPPP',
      tenderNumber: col(cells, 'tenderNumber', 0) || undefined,
      title: col(cells, 'title', 1),
      department: col(cells, 'department', 2),
      state: col(cells, 'state', 3) || 'Central',
      publishedDate: parseIndianDate(col(cells, 'publishedDate', 4)),
      closingDate: parseIndianDate(col(cells, 'closingDate', 5)),
      budget: normalizeCurrency(col(cells, 'budget', 6)),
      emd: normalizeCurrency(col(cells, 'emd', 7)),
      pdfUrl: extractPdfUrl(rowHtml, baseUrl),
      sourceUrl: extractSourceUrl(rowHtml, baseUrl),
      rawHtml: match[0],
    }

    if (isValidTender(tender)) results.push(tender)
  }

  return results
}
