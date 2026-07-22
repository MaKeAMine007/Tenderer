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
  stripSerialPrefix,
} from '../utils/normalize'

export function parseHtml(html: string, baseUrl: string): ParsedTender[] {
  const colMap = buildHeaderMap(html)
  const hasHeaders = Object.keys(colMap).length > 0

  const col = (cells: string[], field: string, fallback: number): string => {
    if (hasHeaders) return cells[resolveColumn(colMap, field)] ?? ''
    return cells[fallback] ?? ''
  }

  const results: ParsedTender[] = []
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let match: RegExpExecArray | null

  while ((match = rowRegex.exec(html)) !== null) {
    const rowHtml = match[1]
    if (/<th/i.test(rowHtml)) continue

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripTags(m[1])
    )
    if (cells.length < 2) continue
    // Skip NICGEP header rows (use td for headers, not th)
    if (!cells[0] || /^(s\.?no|sr\.?|#|sl|tender\s*title|reference\s*no|organisation)\b/i.test(cells[0].trim())) continue

    const tender: ParsedTender = {
      portal: 'UP',
      // NICGEP column order: 0=Tender Title, 1=Reference No, 2=Closing Date, 3=Bid Opening Date
      tenderNumber: col(cells, 'tenderNumber', 1) || undefined,
      title: stripSerialPrefix(col(cells, 'title', 0)),
      department: col(cells, 'department', 4) || 'Government of Uttar Pradesh',
      state: 'Uttar Pradesh',
      publishedDate: parseIndianDate(col(cells, 'publishedDate', 5)),
      closingDate: parseIndianDate(col(cells, 'closingDate', 2)),
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
