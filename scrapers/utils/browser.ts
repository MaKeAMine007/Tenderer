import type { Browser } from 'playwright'

const CLOSE_TIMEOUT_MS = parseInt(process.env.SCRAPER_BROWSER_CLOSE_TIMEOUT_MS ?? '8000')

export async function closeBrowser(browser: Browser): Promise<void> {
  await Promise.race([
    browser.close(),
    new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('[browser] close() timed out — abandoning (browser process will exit with server)')
        resolve()
      }, CLOSE_TIMEOUT_MS)
    }),
  ])
}
