'use client'

import { useCallback, useEffect, useState } from 'react'
import { Skeleton } from '@/app/components/ui/Skeleton'

interface PortalHealth {
  portal: string
  totalRuns: number
  successfulRuns: number
  successRate: number
  lastSuccess: string | null
  lastFailure: string | null
  avgDurationMs: number
  totalFetched: number
  totalNew: number
  // Business metrics
  totalTenders: number
  relevantTenders: number
  pursue: number
  maybe: number
  pass: number
  pendingAI: number
  avgMatchScore: number | null
  avgConfidence: number | null
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function HealthBadge({ rate }: { rate: number }) {
  const color = rate >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : rate >= 70 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-red-100 text-red-600 border-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border tabular-nums ${color}`}>
      {rate}%
    </span>
  )
}

export default function ScraperHealthPage() {
  const [portals, setPortals] = useState<PortalHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/scraper-health')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPortals(data.portals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="px-6 py-5 flex flex-col gap-4 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900">Scraper Health</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Per-portal scraper performance (last 100 runs)</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded p-4 space-y-3">
            <Skeleton className="h-5 w-20" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((__, j) => <Skeleton key={j} className="h-3 w-full" />)}
            </div>
          </div>
        ))}

        {!loading && portals.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-zinc-400">
            No scraper run data available. Run a scrape first.
          </div>
        )}

        {!loading && portals.map((p) => (
          <div key={p.portal} className="bg-white border border-zinc-200 rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-zinc-800">{p.portal}</span>
              <HealthBadge rate={p.successRate} />
            </div>

            <div className="space-y-2 text-xs">
              {/* Scraper metrics */}
              <Row label="Total Runs" value={p.totalRuns.toLocaleString()} />
              <Row label="Successful" value={`${p.successfulRuns} / ${p.totalRuns}`} />
              <Row label="Avg Runtime" value={p.avgDurationMs > 0 ? `${(p.avgDurationMs / 1000).toFixed(1)}s` : '—'} />
              <Row label="Total Fetched" value={p.totalFetched.toLocaleString()} />
              <Row label="Total New" value={p.totalNew.toLocaleString()} accent />

              {/* Business metrics */}
              {p.totalTenders > 0 && (
                <>
                  <div className="border-t border-zinc-100 pt-2 mt-2">
                    <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide mb-1.5">Business Intelligence</div>
                    <div className="space-y-1.5">
                      <Row label="Total Tenders" value={p.totalTenders.toLocaleString()} />
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Pursue / Maybe / Pass</span>
                        <span className="font-medium tabular-nums">
                          <span className="text-emerald-700">{p.pursue}</span>
                          <span className="text-zinc-300 mx-1">/</span>
                          <span className="text-amber-600">{p.maybe}</span>
                          <span className="text-zinc-300 mx-1">/</span>
                          <span className="text-red-500">{p.pass}</span>
                        </span>
                      </div>
                      {p.pendingAI > 0 && (
                        <Row label="Pending AI" value={p.pendingAI.toLocaleString()} />
                      )}
                      {p.avgMatchScore !== null && (
                        <Row label="Avg Match Score" value={`${p.avgMatchScore}/100`} />
                      )}
                      {p.avgConfidence !== null && p.avgConfidence > 0 && (
                        <Row label="Avg Confidence" value={`${p.avgConfidence}%`} />
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-zinc-100 pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Last Success</span>
                  <span className="text-emerald-700 font-medium">{formatRelative(p.lastSuccess)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Last Failure</span>
                  <span className={p.lastFailure ? 'text-red-500' : 'text-zinc-400'}>
                    {formatRelative(p.lastFailure)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table view */}
      {!loading && portals.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100">
            <span className="text-xs font-semibold text-zinc-700">Summary Table</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Portal</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Runs</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Success</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Tenders</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Pursue</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Maybe</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Pass</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Pending AI</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Avg Match</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Last Success</th>
                </tr>
              </thead>
              <tbody>
                {portals.map((p, i) => (
                  <tr key={p.portal} className={`border-b border-zinc-100 ${i % 2 === 1 ? 'bg-zinc-50/60' : ''}`}>
                    <td className="px-4 py-2.5 text-xs font-semibold text-zinc-800">{p.portal}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-600 tabular-nums">{p.totalRuns}</td>
                    <td className="px-4 py-2.5 text-right"><HealthBadge rate={p.successRate} /></td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-600 tabular-nums">{p.totalTenders.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-emerald-700 tabular-nums font-medium">{p.pursue > 0 ? p.pursue : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-amber-600 tabular-nums font-medium">{p.maybe > 0 ? p.maybe : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-red-500 tabular-nums">{p.pass > 0 ? p.pass : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-amber-500 tabular-nums">{p.pendingAI > 0 ? p.pendingAI : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-600 tabular-nums">
                      {p.avgMatchScore !== null ? `${p.avgMatchScore}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-emerald-700">{formatRelative(p.lastSuccess)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={`font-medium tabular-nums ${accent ? 'text-emerald-700' : 'text-zinc-700'}`}>{value}</span>
    </div>
  )
}
