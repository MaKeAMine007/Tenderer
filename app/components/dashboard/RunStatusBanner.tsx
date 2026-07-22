'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ScrapeStatusResponse } from '@/types'

interface RunStatusBannerProps {
  refreshKey: number
  onRunComplete?: () => void
}

export function RunStatusBanner({ refreshKey, onRunComplete }: RunStatusBannerProps) {
  const [status, setStatus] = useState<ScrapeStatusResponse | null>(null)
  const prevRunning = useRef(false)

  async function fetchStatus() {
    try {
      const res = await fetch('/api/scrape/status')
      if (!res.ok) return
      const data: ScrapeStatusResponse = await res.json()
      setStatus(data)

      if (prevRunning.current && !data.isRunning) {
        onRunComplete?.()
      }
      prevRunning.current = data.isRunning
    } catch {
      // non-fatal
    }
  }

  // Refetch on refreshKey change (after manual scrape)
  useEffect(() => {
    fetchStatus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // Poll every 10s while a run is active
  useEffect(() => {
    if (!status?.isRunning) return
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.isRunning])

  if (!status) return null

  const { isRunning, currentRun, lastCompletedRun } = status

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border border-zinc-200 rounded text-xs text-zinc-500">
      <div className="flex items-center gap-3">
        {isRunning && currentRun ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-medium text-amber-700">Running</span>
            </span>
            <span>
              Started {formatTimeAgo(currentRun.startedAt)} · triggered by {currentRun.triggeredBy}
            </span>
          </>
        ) : lastCompletedRun ? (
          <>
            <span
              className={`font-medium ${
                lastCompletedRun.status === 'SUCCESS'
                  ? 'text-emerald-700'
                  : lastCompletedRun.status === 'PARTIAL_SUCCESS'
                  ? 'text-amber-700'
                  : 'text-red-600'
              }`}
            >
              {lastCompletedRun.status === 'SUCCESS'
                ? 'Success'
                : lastCompletedRun.status === 'PARTIAL_SUCCESS'
                ? 'Partial'
                : 'Failed'}
            </span>
            <span>
              Last run {formatTimeAgo(lastCompletedRun.startedAt)} ·{' '}
              {lastCompletedRun.totalNew} new · {lastCompletedRun.totalFetched} fetched
              {lastCompletedRun.durationMs
                ? ` · ${(lastCompletedRun.durationMs / 1000).toFixed(0)}s`
                : ''}
            </span>
          </>
        ) : (
          <span>No runs yet</span>
        )}
      </div>

      <Link
        href="/history"
        className="text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors"
      >
        View history
      </Link>
    </div>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
