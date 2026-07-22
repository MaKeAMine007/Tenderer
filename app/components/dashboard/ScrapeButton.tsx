'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/Button'

interface ScrapeButtonProps {
  onComplete: () => void
}

interface ScrapeResult {
  totalNew: number
  totalUpdated: number
  durationMs: number
}

export function ScrapeButton({ onComplete }: ScrapeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScrapeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleScrape() {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await fetch('/api/scrape', { method: 'POST' })

      if (res.status === 409) {
        setError('Already running')
        return
      }

      if (!res.ok) throw new Error('Scrape request failed')

      const data = await res.json()
      setResult({
        totalNew: data.totalNew,
        totalUpdated: data.totalUpdated,
        durationMs: data.durationMs,
      })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && !loading && (
        <span className="text-xs text-zinc-500 tabular-nums">
          +{result.totalNew} new · {result.totalUpdated} updated · {(result.durationMs / 1000).toFixed(1)}s
        </span>
      )}
      {error && !loading && (
        <span className="text-xs text-red-500">{error}</span>
      )}
      <Button variant="primary" onClick={handleScrape} loading={loading}>
        {loading ? 'Scraping…' : 'Run Scraper'}
      </Button>
    </div>
  )
}
