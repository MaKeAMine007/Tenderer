'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ScraperRunRow, ScraperResult, RunStatus } from '@/types'
import { Skeleton } from '@/app/components/ui/Skeleton'

export default function HistoryPage() {
  const router = useRouter()
  const [runs, setRuns] = useState<ScraperRunRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/scrape/history?limit=50')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((data) => setRuns(data.runs))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col">
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-sm font-semibold text-zinc-900">Scrape Runs</h1>
          {!loading && <span className="text-xs text-zinc-400">{runs.length} runs</span>}
        </div>

        {error && (
          <div className="text-sm text-red-500 py-8 text-center">{error}</div>
        )}

        {loading && (
          <div className="bg-white border border-zinc-200 rounded overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-zinc-100 flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && runs.length === 0 && (
          <div className="py-16 text-center text-sm text-zinc-400">No runs yet</div>
        )}

        {!loading && !error && runs.length > 0 && (
          <div className="bg-white border border-zinc-200 rounded overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Started</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Trigger</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Fetched</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">New</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Updated</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Failed</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => (
                  <Fragment key={run.id}>
                    <tr
                      className={`border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors ${i % 2 === 1 ? 'bg-zinc-50/60' : ''}`}
                      onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                    >
                      <td className="px-4 py-2.5">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600 whitespace-nowrap">
                        {formatDateTime(run.startedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 capitalize">
                        {run.triggeredBy}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-700 tabular-nums font-medium">
                        {run.totalFetched}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium text-emerald-700">
                        +{run.totalNew}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-zinc-500">
                        {run.totalUpdated}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-red-500">
                        {run.totalFailed > 0 ? run.totalFailed : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-300">
                        {expanded === run.id ? '▲' : '▼'}
                      </td>
                    </tr>

                    {expanded === run.id && (
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <td colSpan={9} className="px-4 py-3">
                          <PortalBreakdown run={run} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const styles: Record<RunStatus, string> = {
    RUNNING: 'bg-amber-100 text-amber-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700',
    PARTIAL_SUCCESS: 'bg-yellow-100 text-yellow-700',
    FAILED: 'bg-red-100 text-red-600',
  }
  const labels: Record<RunStatus, string> = {
    RUNNING: 'Running',
    SUCCESS: 'Success',
    PARTIAL_SUCCESS: 'Partial',
    FAILED: 'Failed',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function PortalBreakdown({ run }: { run: ScraperRunRow }) {
  const portals = run.perPortalResults as ScraperResult[] | null

  if (!portals || portals.length === 0) {
    if (run.errorSummary) {
      return (
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1">Error</p>
          <pre className="text-xs text-red-500 whitespace-pre-wrap">{run.errorSummary}</pre>
        </div>
      )
    }
    return <p className="text-xs text-zinc-400">No portal data available</p>
  }

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Per-portal breakdown</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {portals.map((p) => (
          <div key={p.portal} className="bg-white border border-zinc-200 rounded px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-zinc-700">{p.portal}</span>
              {p.errors.length > 0 ? (
                <span className="text-xs text-red-500">✕ Error</span>
              ) : p.warnings.length > 0 ? (
                <span className="text-xs text-amber-500">⚠ Warn</span>
              ) : (
                <span className="text-xs text-emerald-600">✓ OK</span>
              )}
            </div>
            <div className="text-xs text-zinc-500 space-y-0.5">
              <div className="flex justify-between"><span>Fetched</span><span className="font-medium text-zinc-700">{p.fetched}</span></div>
              <div className="flex justify-between"><span>New</span><span className="font-medium text-emerald-700">+{p.newCount}</span></div>
              <div className="flex justify-between"><span>Updated</span><span>{p.updated}</span></div>
              <div className="flex justify-between"><span>Time</span><span>{(p.durationMs / 1000).toFixed(1)}s</span></div>
            </div>
            {p.errors.length > 0 && (
              <p className="mt-1 text-xs text-red-500 truncate" title={p.errors[0]}>{p.errors[0]}</p>
            )}
            {p.warnings.length > 0 && p.errors.length === 0 && (
              <p className="mt-1 text-xs text-amber-600 truncate" title={p.warnings[0]}>{p.warnings[0]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
