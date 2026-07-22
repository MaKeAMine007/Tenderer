type PdfParseResult = { text: string; numpages: number }
type PdfParser = (buffer: Buffer, options?: { max?: number }) => Promise<PdfParseResult>

// pdf-parse is CJS-only; excluded from bundling via serverExternalPackages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as PdfParser

const PDF_DOWNLOAD_TIMEOUT_MS = parseInt(process.env.PDF_DOWNLOAD_TIMEOUT_MS ?? '30000')

export interface PdfResult {
  text: string
  pages: number
  durationMs: number
}

export async function fetchAndExtractPdf(url: string): Promise<PdfResult> {
  const start = Date.now()

  const response = await fetch(url, {
    signal: AbortSignal.timeout(PDF_DOWNLOAD_TIMEOUT_MS),
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/pdf,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`PDF fetch failed: HTTP ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
    throw new Error(`Unexpected content-type: ${contentType}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 100) throw new Error('PDF too small — likely an error page')

  const data = await pdfParse(buffer, { max: 0 })

  return {
    text: data.text ?? '',
    pages: data.numpages ?? 0,
    durationMs: Date.now() - start,
  }
}
