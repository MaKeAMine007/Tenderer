import { ParsedTender } from '@/types'
import { parseHtml } from './parser'
import { launchBrowser, closeBrowser } from '../utils/browser'

const BASE_URL = 'https://govtprocurement.delhi.gov.in'
const PORTAL_URL = `${BASE_URL}/nicgep/app`

const GOTO_TIMEOUT = parseInt(process.env.SCRAPER_GOTO_TIMEOUT_MS ?? '30000')
const SELECTOR_TIMEOUT = parseInt(process.env.SCRAPER_SELECTOR_TIMEOUT_MS ?? '15000')
const LOAD_TIMEOUT = parseInt(process.env.SCRAPER_LOAD_TIMEOUT_MS ?? '15000')
const MAX_PAGES = parseInt(process.env.SCRAPER_MAX_PAGES ?? '5')

export async function scrape(): Promise<ParsedTender[]> {
  const browser = await launchBrowser()
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    await page.goto(PORTAL_URL, { waitUntil: 'networkidle', timeout: GOTO_TIMEOUT })
    await page.waitForSelector('table', { timeout: SELECTOR_TIMEOUT }).catch(() => null)

    const tenders: ParsedTender[] = []
    let pageNum = 1

    while (pageNum <= MAX_PAGES) {
      const html = await page.content()
      const parsed = parseHtml(html, BASE_URL)
      tenders.push(...parsed)
      console.log(`[Delhi] Page ${pageNum}: ${parsed.length} tenders`)

      const nextBtn = await page.$(
        'a[title="Next Page"], a:has-text("Next"), .nextPage, [aria-label="Next page"], input[value="Next"]'
      )
      if (!nextBtn) break

      await nextBtn.click()
      await page.waitForLoadState('networkidle', { timeout: LOAD_TIMEOUT }).catch(() => null)
      pageNum++
    }

    return tenders
  } finally {
    await closeBrowser(browser)
  }
}
