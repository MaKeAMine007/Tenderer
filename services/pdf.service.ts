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

  // pdf-parse v2 is "type":"module"; dynamic import avoids top-level require
  // failing at serverless cold-start on Vercel ("Failed to load external module")
  const mod = await import('pdf-parse').catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`pdf-parse unavailable: ${msg}`)
  })

  // v2 exports PDFParse class (not a callable function like v1)
  const PDFParse = mod.PDFParse as new (opts: {
    data: Uint8Array
    verbosity?: number
  }) => {
    getText(opts?: Record<string, unknown>): Promise<{ text: string; total: number }>
    destroy(): Promise<void>
  }

  if (typeof PDFParse !== 'function') {
    throw new Error(`pdf-parse module shape unexpected: ${Object.keys(mod).join(', ')}`)
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 })
  try {
    const data = await parser.getText()
    return {
      text: data.text ?? '',
      pages: data.total ?? 0,
      durationMs: Date.now() - start,
    }
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}
