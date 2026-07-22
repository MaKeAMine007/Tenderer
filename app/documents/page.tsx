'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Skeleton } from '@/app/components/ui/Skeleton'

type DocStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW'

interface DocumentRow {
  id: string
  title: string
  portal: string
  department: string
  pdfUrl: string | null
  documentStatus: DocStatus
  documentSource: string | null
  documentProcessedAt: string | null
  documentError: string | null
  processingMs: number | null
  updatedAt: string
}

interface StatusCounts {
  PENDING: number
  PROCESSING: number
  COMPLETED: number
  FAILED: number
  NEEDS_REVIEW: number
}

const STATUS_CONFIG: Record<DocStatus, { label: string; colors: string }> = {
  PENDING: { label: 'Pending', colors: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  PROCESSING: { label: 'Processing', colors: 'bg-blue-50 text-blue-600 border-blue-100' },
  COMPLETED: { label: 'Completed', colors: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  FAILED: { label: 'Failed', colors: 'bg-red-50 text-red-600 border-red-100' },
  NEEDS_REVIEW: { label: 'Review', colors: 'bg-amber-50 text-amber-600 border-amber-100' },
}

function DocStatusBadge({ status }: { status: DocStatus }) {
  const { label, colors } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors}`}>
      {label}
    </span>
  )
}

type FilterStatus = DocStatus | 'all'

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [counts, setCounts] = useState<StatusCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/documents')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setDocs(data.documents)
      setCounts(data.statusCounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = docs
    if (filter !== 'all') list = list.filter((d) => d.documentStatus === filter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((d) =>
        d.title.toLowerCase().includes(q) || d.portal.toLowerCase().includes(q) || d.department.toLowerCase().includes(q)
      )
    }
    return list
  }, [docs, filter, search])

  const tabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: docs.length },
    { key: 'PENDING', label: 'Pending', count: counts?.PENDING ?? 0 },
    { key: 'COMPLETED', label: 'Completed', count: counts?.COMPLETED ?? 0 },
    { key: 'FAILED', label: 'Failed', count: counts?.FAILED ?? 0 },
    { key: 'NEEDS_REVIEW', label: 'Needs Review', count: counts?.NEEDS_REVIEW ?? 0 },
  ]

  return (
    <div className="px-6 py-5 flex flex-col gap-4 max-w-screen-2xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900">Documents</h1>
          <p className="text-xs text-zinc-400 mt-0.5">PDF and HTML extraction status for all tenders</p>
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

      {/* Stats row */}
      {!loading && counts && (
        <div className="grid grid-cols-5 gap-3">
          {(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW'] as DocStatus[]).map((s) => {
            const { label, colors } = STATUS_CONFIG[s]
            return (
              <div key={s} className="bg-white border border-zinc-200 rounded px-4 py-3">
                <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">{label}</div>
                <div className="text-xl font-semibold text-zinc-900 tabular-nums">{counts[s].toLocaleString()}</div>
              </div>
            )
          })}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded px-4 py-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        {/* Tabs + search */}
        <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-zinc-100 flex-wrap gap-y-2">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === key ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              {label}
              <span className={`tabular-nums ${filter === key ? 'text-zinc-300' : 'text-zinc-400'}`}>{count}</span>
            </button>
          ))}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        {error && <div className="px-6 py-8 text-center text-sm text-red-500">{error}</div>}

        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-[80px]">Portal</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-[80px]">Source</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-[80px]">PDF</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide w-[100px]">Proc. Time</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Error</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="px-4 py-2.5"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-full" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-12" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="px-4 py-2.5"><Skeleton className="h-4 w-32" /></td>
                  </tr>
                ))}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-400">
                      No documents match filter.
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((doc, i) => (
                  <tr key={doc.id} className={`border-b border-zinc-100 ${i % 2 === 1 ? 'bg-zinc-50/60' : ''}`}>
                    <td className="px-4 py-2.5"><DocStatusBadge status={doc.documentStatus} /></td>
                    <td className="px-4 py-2.5 max-w-0">
                      <span className="block truncate text-xs text-zinc-800 font-medium" title={doc.title}>{doc.title}</span>
                      <span className="block truncate text-[11px] text-zinc-400" title={doc.department}>{doc.department}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{doc.portal}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-500">{doc.documentSource ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {doc.pdfUrl ? (
                        <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">PDF</a>
                      ) : <span className="text-xs text-zinc-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums">
                      {doc.processingMs != null ? `${(doc.processingMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      {doc.documentError ? (
                        <span className="text-xs text-red-500 truncate block" title={doc.documentError}>{doc.documentError}</span>
                      ) : <span className="text-xs text-zinc-300">—</span>}
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
