'use client'

import { useCallback, useEffect, useState } from 'react'
import { Skeleton } from '@/app/components/ui/Skeleton'

interface NameCount { name: string; count: number }

interface AnalyticsData {
  total: number
  byPortal: NameCount[]
  byState: NameCount[]
  byDepartment: NameCount[]
  relevantPercent: number
  documentSuccessPercent: number
  aiSuccessPercent: number
  dailyScrapes: { date: string; fetched: number; newCount: number; status: string }[]
}

function BarItem({ label, value, max, accent }: { label: string; value: number; max: number; accent?: boolean }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 group">
      <div className="w-28 shrink-0 text-xs text-zinc-600 truncate" title={label}>{label}</div>
      <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all ${accent ? 'bg-blue-500' : 'bg-zinc-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-10 text-right text-xs text-zinc-500 tabular-nums shrink-0">{value.toLocaleString()}</div>
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded px-4 py-3">
      <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-zinc-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/analytics')
      if (!res.ok) throw new Error('Failed to fetch')
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const portalMax = data?.byPortal[0]?.count ?? 1
  const stateMax = data?.byState[0]?.count ?? 1
  const deptMax = data?.byDepartment[0]?.count ?? 1

  return (
    <div className="px-6 py-5 flex flex-col gap-6 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900">Analytics</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Aggregated insights across all tender data</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading ? Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded px-4 py-3">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-12" />
          </div>
        )) : (
          <>
            <SummaryCard label="Total Tenders" value={data?.total.toLocaleString() ?? '—'} />
            <SummaryCard label="Relevant %" value={`${data?.relevantPercent ?? 0}%`} sub="of all tenders" />
            <SummaryCard label="Document Success" value={`${data?.documentSuccessPercent ?? 0}%`} sub="extracted" />
            <SummaryCard label="AI Success" value={`${data?.aiSuccessPercent ?? 0}%`} sub="analyzed" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* By portal */}
        <div className="bg-white border border-zinc-200 rounded p-4">
          <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-4">Tenders by Portal</h3>
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.byPortal.length === 0 ? (
            <p className="text-xs text-zinc-400">No data</p>
          ) : (
            <div className="space-y-2">
              {data!.byPortal.map(({ name, count }) => (
                <BarItem key={name} label={name} value={count} max={portalMax} accent />
              ))}
            </div>
          )}
        </div>

        {/* By state */}
        <div className="bg-white border border-zinc-200 rounded p-4">
          <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-4">Tenders by State (Top 15)</h3>
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.byState.length === 0 ? (
            <p className="text-xs text-zinc-400">No data</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64">
              {data!.byState.map(({ name, count }) => (
                <BarItem key={name} label={name} value={count} max={stateMax} />
              ))}
            </div>
          )}
        </div>

        {/* By department */}
        <div className="bg-white border border-zinc-200 rounded p-4">
          <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-4">Top Departments</h3>
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : data?.byDepartment.length === 0 ? (
            <p className="text-xs text-zinc-400">No data</p>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64">
              {data!.byDepartment.map(({ name, count }) => (
                <BarItem key={name} label={name} value={count} max={deptMax} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily scrapes */}
      <div className="bg-white border border-zinc-200 rounded p-4">
        <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-4">Recent Scrape Runs (Last 30)</h3>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : !data?.dailyScrapes.length ? (
          <p className="text-xs text-zinc-400">No scrape history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="py-1.5 text-left text-zinc-500 font-medium">Date</th>
                  <th className="py-1.5 text-right text-zinc-500 font-medium">Fetched</th>
                  <th className="py-1.5 text-right text-zinc-500 font-medium">New</th>
                  <th className="py-1.5 text-right text-zinc-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyScrapes.slice(0, 20).map((s, i) => (
                  <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50">
                    <td className="py-1.5 text-zinc-600">{s.date}</td>
                    <td className="py-1.5 text-right text-zinc-600 tabular-nums">{s.fetched}</td>
                    <td className="py-1.5 text-right text-emerald-700 tabular-nums font-medium">+{s.newCount}</td>
                    <td className="py-1.5 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        s.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700'
                        : s.status === 'FAILED' ? 'bg-red-50 text-red-600'
                        : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
