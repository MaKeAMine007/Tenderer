import { ScraperResult, ParsedTender } from '@/types'
import { saveTenders } from '@/services/tender.service'
import { withRetry } from './utils/retry'

const MAX_RETRIES = parseInt(process.env.SCRAPER_MAX_RETRIES ?? '2')
const RETRY_BASE_DELAY_MS = 2000

// Hard cap per portal — prevents a hung browser from blocking the whole pipeline.
// Should be well below the overall pipeline timeout.
const PER_PORTAL_TIMEOUT_MS = parseInt(process.env.SCRAPER_PORTAL_TIMEOUT_MS ?? '60000')

interface Portal {
  name: string
  enabled: boolean
  scrape: () => Promise<ParsedTender[]>
}

async function loadPortals(): Promise<Portal[]> {
  const [cppp, up, haryana, delhi, demo] = await Promise.all([
    import('./cppp/scraper'),
    import('./up/scraper'),
    import('./haryana/scraper'),
    import('./delhi/scraper'),
    import('./demo/scraper'),
  ])

  return [
    { name: 'CPPP',    enabled: true,  scrape: cppp.scrape    },
    { name: 'UP',      enabled: true,  scrape: up.scrape      },
    { name: 'Haryana', enabled: true,  scrape: haryana.scrape },
    { name: 'Delhi',   enabled: true,  scrape: delhi.scrape   },
    // Keep Demo disabled in production — contains seed data only
    { name: 'Demo',    enabled: process.env.NODE_ENV !== 'production', scrape: demo.scrape },
  ]
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`[${label}] timed out after ${ms}ms`)), ms)
    ),
  ])
}

async function scrapePortal(portal: Portal): Promise<ScraperResult> {
  const start = Date.now()
  const errors: string[] = []
  const warnings: string[] = []
  let tenders: ParsedTender[] = []

  try {
    tenders = await withTimeout(
      withRetry(() => portal.scrape(), MAX_RETRIES + 1, RETRY_BASE_DELAY_MS),
      PER_PORTAL_TIMEOUT_MS,
      portal.name
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(msg)
    console.error(`[${portal.name}] scrape failed: ${msg}`)
  }

  if (tenders.length === 0 && errors.length === 0) {
    const warning = 'Returned 0 tenders — possible bot block, login wall, or site change'
    warnings.push(warning)
    console.warn(`[${portal.name}] ${warning}`)
  }

  let newCount = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  if (tenders.length > 0) {
    try {
      const saved = await saveTenders(tenders, portal.name)
      newCount = saved.newCount
      updated = saved.updated
      skipped = saved.skipped
      failed = saved.failed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`DB save failed: ${msg}`)
      console.error(`[${portal.name}] DB save failed: ${msg}`)
    }
  }

  const durationMs = Date.now() - start

  console.log(
    `[${portal.name}] Fetched: ${tenders.length} | New: ${newCount} | Updated: ${updated} | Skipped: ${skipped} | Failed: ${failed} | Time: ${(durationMs / 1000).toFixed(1)}s`
  )
  if (warnings.length) console.warn(`[${portal.name}] Warnings: ${warnings.join('; ')}`)
  if (errors.length)   console.error(`[${portal.name}] Errors: ${errors.join('; ')}`)

  return { portal: portal.name, fetched: tenders.length, newCount, updated, skipped, failed, errors, warnings, durationMs }
}

export async function runAllScrapers(): Promise<ScraperResult[]> {
  const portals = (await loadPortals()).filter((p) => p.enabled)

  console.log(`[scraper] Starting ${portals.length} portals in parallel`)

  // Run all portals concurrently — each has its own per-portal timeout
  const settled = await Promise.allSettled(portals.map((p) => scrapePortal(p)))

  const results: ScraperResult[] = settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') return outcome.value
    // Promise.allSettled shouldn't reach here since scrapePortal catches internally,
    // but guard anyway
    const msg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
    console.error(`[${portals[i].name}] unexpected rejection: ${msg}`)
    return {
      portal: portals[i].name, fetched: 0, newCount: 0, updated: 0,
      skipped: 0, failed: 0, errors: [msg], warnings: [], durationMs: 0,
    }
  })

  const failedPortals = results.filter((r) => r.errors.length > 0).map((r) => r.portal)
  const warnPortals   = results.filter((r) => r.warnings.length > 0).map((r) => r.portal)
  if (failedPortals.length) console.error(`[scraper] FAILED: ${failedPortals.join(', ')}`)
  if (warnPortals.length)   console.warn(`[scraper] WARN: ${warnPortals.join(', ')}`)

  const totals = results.reduce(
    (acc, r) => ({ fetched: acc.fetched + r.fetched, new: acc.new + r.newCount }),
    { fetched: 0, new: 0 }
  )
  console.log(`[scraper] Complete — ${totals.fetched} fetched, ${totals.new} new across ${results.length} portals`)

  return results
}
