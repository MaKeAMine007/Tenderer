import type { Browser } from 'playwright-core'

const CLOSE_TIMEOUT_MS = parseInt(process.env.SCRAPER_BROWSER_CLOSE_TIMEOUT_MS ?? '8000')

/**
 * On Vercel (VERCEL env set), uses @sparticuz/chromium binary via playwright-core.
 * This bypasses playwright-core's browsers.json lookup, which fails on Vercel because
 * coreBundle.js requires it via absolute runtime path that NFT cannot trace at build time.
 *
 * Locally, falls back to playwright's own bundled Chromium (requires: npx playwright install chromium).
 */
export async function launchBrowser(): Promise<Browser> {
  const { chromium: playwrightChromium } = await import('playwright-core')

  if (process.env.VERCEL) {
    const { default: Chromium } = await import('@sparticuz/chromium')
    return playwrightChromium.launch({
      args: Chromium.args,
      executablePath: await Chromium.executablePath(),
      headless: true,
    })
  }

  const { chromium } = await import('playwright')
  return chromium.launch({ headless: true })
}

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
