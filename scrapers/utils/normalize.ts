export function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function parseIndianDate(raw: string): Date | undefined {
  if (!raw?.trim()) return undefined
  const clean = raw.trim().replace(/\s+/g, ' ')
  const [datePart] = clean.split(' ')
  const parts = datePart.split(/[\/\-]/)
  if (parts.length !== 3) return undefined
  const [a, b, c] = parts
  let year: string, month: string, day: string
  if (c?.length === 4) {
    ;[day, month, year] = [a, b, c]
  } else if (a?.length === 4) {
    ;[year, month, day] = [a, b, c]
  } else {
    return undefined
  }
  if (!day || !month || !year) return undefined
  const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
  return isNaN(d.getTime()) ? undefined : d
}

export function normalizeCurrency(raw: string): string | undefined {
  if (!raw?.trim()) return undefined
  const s = raw.trim().replace(/\s+/g, ' ')
  const lower = s.toLowerCase()
  if (!s || /^[-–—]+$/.test(s) || ['na', 'n/a', 'nil', 'none', '-', '0', '0.00'].includes(lower)) {
    return undefined
  }
  return s.replace(/^Rs\.?\s+/i, '₹').replace(/^INR\s+/i, '₹')
}

const FIELD_ALIASES: Record<string, string[]> = {
  tenderNumber: [
    'tender id',
    'tender no',
    'tender no.',
    'tender number',
    'tender ref. no',
    'tender ref no',
    'tender ref no.',
    'ref. no',
    'ref no',
    'tender reference number',
    'bid no',
    'bid number',
  ],
  title: [
    'tender title',
    'work description',
    'title',
    'tender name',
    'work / item description',
    'item description',
    'description',
    'tender title / work description',
    'name of work',
    'work name',
  ],
  department: [
    'organisation name',
    'organization name',
    'department',
    'dept',
    'organisation',
    'organization',
    'ministry / state / dept',
    'ministry / dept',
    'ministry',
    'dept. name',
    'authority name',
  ],
  state: ['state', 'state name', 'location', 'state / ut'],
  publishedDate: [
    'published date',
    'tender published date',
    'publish date',
    'date of publication',
    'epublished date',
    'start date',
    'bid start date',
    'published on',
  ],
  closingDate: [
    'bid submission end date',
    'closing date',
    'bid closing date',
    'submission date',
    'last date of submission',
    'end date',
    'bid submission closing date',
    'document download / sale end date',
    'bid submission end date / time',
    'closing date / time',
    'due date',
    'last date',
  ],
  budget: [
    'estimated cost',
    'budget',
    'estimated amount',
    'contract value',
    'amount',
    'estimated cost (in ₹)',
    'approx. value',
    'value (rs.)',
    'tender value',
    'tender value (₹)',
    'estimated value',
    'contract amount',
  ],
  emd: [
    'emd amount',
    'emd',
    'earnest money deposit',
    'bid security',
    'emd (rs.)',
    'emd amount (₹)',
    'bid security amount',
  ],
}

export function resolveColumn(colMap: Record<string, number>, field: string): number {
  const aliases = FIELD_ALIASES[field]
  if (!aliases) return -1
  for (const alias of aliases) {
    if (alias in colMap) return colMap[alias]
  }
  return -1
}

export function buildHeaderMap(html: string): Record<string, number> {
  const map: Record<string, number> = {}

  // Try <th> elements first (standard)
  const thMatches = [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)]
  if (thMatches.length > 0) {
    thMatches.forEach((m, i) => {
      const text = stripTags(m[1]).toLowerCase().replace(/\s+/g, ' ').trim()
      if (text) map[text] = i
    })
    return map
  }

  // Fallback: detect <td>-based header rows (NICGEP and similar portals).
  // A row is a header row when its first cell matches a known header keyword.
  const HEADER_KEYWORDS = /^(tender\s*title|s\.?no\.?|reference\s*no|tender\s*no|organisation|closing\s*date|bid\s*submission|published|description|work|sl\.?\s*no)/i
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let m: RegExpExecArray | null
  while ((m = rowRegex.exec(html)) !== null) {
    const rowHtml = m[1]
    if (/<th/i.test(rowHtml)) continue  // already handled above
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      stripTags(c[1]).toLowerCase().replace(/\s+/g, ' ').trim()
    )
    if (cells.length < 2) continue
    if (HEADER_KEYWORDS.test(cells[0])) {
      cells.forEach((text, i) => { if (text) map[text] = i })
      break  // use only the first detected header row
    }
  }
  return map
}

export function extractSourceUrl(rowHtml: string, baseUrl: string): string {
  const tenderLinkMatch = rowHtml.match(
    /href="([^"]*(?:tender|nicgep|eprocure|app\?|GetTender|view)[^"]*)"/i
  )
  if (tenderLinkMatch) {
    try {
      return new URL(tenderLinkMatch[1], baseUrl).href
    } catch { /* fall through */ }
  }
  const anyLinkMatch = rowHtml.match(/href="([^"#][^"]{4,})"/i)
  if (anyLinkMatch) {
    try {
      return new URL(anyLinkMatch[1], baseUrl).href
    } catch { /* fall through */ }
  }
  return baseUrl
}

export function extractPdfUrl(rowHtml: string, baseUrl: string): string | undefined {
  const m = rowHtml.match(/href="([^"]*\.pdf[^"]*)"/i)
  if (!m) return undefined
  try {
    return new URL(m[1], baseUrl).href
  } catch {
    return undefined
  }
}

// Strips serial-number prefixes like "1. ", "12. " that NICGEP portals prepend to tender titles.
export function stripSerialPrefix(title: string): string {
  return title.replace(/^\d+\.\s+/, '').trim()
}

// Returns false for rows that are obviously metadata/footer/header text, not real tenders.
const JUNK_PATTERNS = [
  /^\d{1,2}-[A-Za-z]{3}-\d{4}$/,                  // date like "22-Jul-2026"
  /^latest\s+(tenders|corrigendum|bids|notice)/i,   // "Latest Tenders/Corrigendum updates..."
  /^updates\s+every/i,
  /corrigendum\s+updates\s+every/i,
  /^designed.*hosted\s+by/i,                        // footer copyright
  /^\(c\)\s+\d{4}/i,
  /^version\s*:\s*\d/i,                             // "Version : 1.09..."
  /^portal\s+policies/i,
  /^site\s+map/i,
  /^contact\s+us/i,
  /^home$/i,
  /^corrigendum\s*title$/i,                         // NICGEP corrigendum header row
  /^bid\s+opening\s+date$/i,                        // column header
  /^closing\s+date$/i,
  /^organisation\s+name$/i,
]

export function isValidTender(t: { title?: string; sourceUrl?: string }): boolean {
  if (!t.title || t.title.trim().length < 5 || !t.sourceUrl) return false
  const title = t.title.trim()
  return !JUNK_PATTERNS.some((re) => re.test(title))
}
