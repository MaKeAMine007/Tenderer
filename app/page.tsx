'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { TenderRow, ScraperRunRow, ScraperResult, RunStatus } from '@/types'
import { StatCards } from '@/app/components/dashboard/StatCards'
import { ScrapeButton } from '@/app/components/dashboard/ScrapeButton'
import { RunStatusBanner } from '@/app/components/dashboard/RunStatusBanner'
import { StatusBadge, PortalBadge, RelevanceBadge, RecommendationBadge } from '@/app/components/ui/Badge'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { Button } from '@/app/components/ui/Button'
import { Pagination } from '@/app/components/dashboard/Pagination'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  total:            number
  newCount:         number
  viewed:           number
  active:           number
  expired:          number
  pursue?:          number
  maybe?:           number
  eligible?:        number
  relevant?:        number
  pendingAI?:       number
  aiFailed?:        number
  closingToday?:    number
  closingThisWeek?: number
  lastSchedulerRun?: string | null
}

interface SchedulerStatus {
  isRunning: boolean
  currentRun: ScraperRunRow | null
  lastCompletedRun: ScraperRunRow | null
}

interface AIStats {
  total: number
  completed: number
  relevant: number
  notRelevant: number
  failed: number
  pending: number
  processing: number
  successRate: number
  relevantRate: number
  provider: string
  model: string
  lastRun: string | null
  configured: boolean
}

type SortKey = keyof Pick<
  TenderRow,
  'title' | 'department' | 'state' | 'publishedDate' | 'closingDate' | 'budget' | 'portal' | 'status'
>

type RelevanceFilter = 'all' | 'relevant' | 'not-relevant' | 'pending' | 'failed'
type RecommendationFilter = 'all' | 'PURSUE' | 'MAYBE' | 'DO_NOT_PURSUE' | 'pending'

interface Filters {
  search: string
  portal: string
  state: string
  status: string
  relevance: RelevanceFilter
  recommendation: RecommendationFilter
  documentStatus: string
}

const INIT_FILTERS: Filters = {
  search: '',
  portal: '',
  state: '',
  status: '',
  relevance: 'all',
  recommendation: 'all',
  documentStatus: '',
}

const PAGE_SIZE = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

function matchesFilter(t: TenderRow, f: Filters): boolean {
  if (f.status && t.status !== f.status) return false
  if (f.portal && t.portal !== f.portal) return false
  if (f.state && t.state !== f.state) return false
  if (f.documentStatus && t.documentStatus !== f.documentStatus) return false
  if (f.relevance === 'relevant' && t.isRelevant !== true) return false
  if (f.relevance === 'not-relevant' && t.isRelevant !== false) return false
  if (f.relevance === 'pending' && !['PENDING', 'PROCESSING'].includes(t.relevanceStatus)) return false
  if (f.relevance === 'failed' && t.relevanceStatus !== 'FAILED') return false
  if (f.recommendation !== 'all') {
    if (f.recommendation === 'pending') {
      if (t.recommendation !== null) return false
    } else {
      if (t.recommendation !== f.recommendation) return false
    }
  }
  if (f.search) {
    const q = f.search.toLowerCase()
    const match =
      t.title.toLowerCase().includes(q) ||
      (t.tenderNumber?.toLowerCase().includes(q) ?? false) ||
      t.department.toLowerCase().includes(q) ||
      t.portal.toLowerCase().includes(q) ||
      t.state.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    if (!match) return false
  }
  return true
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RunStatusBadge({ status }: { status: RunStatus }) {
  const styles: Record<RunStatus, string> = {
    RUNNING: 'bg-amber-100 text-amber-700 border-amber-200',
    SUCCESS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    PARTIAL_SUCCESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    FAILED: 'bg-red-100 text-red-600 border-red-200',
  }
  const labels: Record<RunStatus, string> = {
    RUNNING: 'Running', SUCCESS: 'Success', PARTIAL_SUCCESS: 'Partial', FAILED: 'Failed',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function PortalBreakdown({ run }: { run: ScraperRunRow }) {
  const portals = run.perPortalResults as ScraperResult[] | null
  if (!portals || portals.length === 0) {
    if (run.errorSummary) return (
      <div>
        <p className="text-xs font-medium text-zinc-500 mb-1">Error</p>
        <pre className="text-xs text-red-500 whitespace-pre-wrap">{run.errorSummary}</pre>
      </div>
    )
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
              {p.errors.length > 0
                ? <span className="text-xs text-red-500">✕ Error</span>
                : p.warnings.length > 0
                ? <span className="text-xs text-amber-500">⚠ Warn</span>
                : <span className="text-xs text-emerald-600">✓ OK</span>}
            </div>
            <div className="text-xs text-zinc-500 space-y-0.5">
              <div className="flex justify-between"><span>Fetched</span><span className="font-medium text-zinc-700">{p.fetched}</span></div>
              <div className="flex justify-between"><span>New</span><span className="font-medium text-emerald-700">+{p.newCount}</span></div>
              <div className="flex justify-between"><span>Updated</span><span>{p.updated}</span></div>
              <div className="flex justify-between"><span>Time</span><span>{(p.durationMs / 1000).toFixed(1)}s</span></div>
            </div>
            {p.errors.length > 0 && <p className="mt-1 text-xs text-red-500 truncate" title={p.errors[0]}>{p.errors[0]}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Th({
  label, sortKey, current, dir, onSort, width = '', align = 'left',
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void; width?: string; align?: 'left' | 'right'
}) {
  const active = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-zinc-800 transition-colors ${width} ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? 'text-zinc-700' : 'text-zinc-300'}`}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

function TenderTableRow({ tender, striped, onClick }: { tender: TenderRow; striped: boolean; onClick: () => void }) {
  const deadline = tender.closingDate ? new Date(tender.closingDate) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null
  const deadlineClass =
    daysLeft === null ? 'text-zinc-400'
    : daysLeft < 0 ? 'text-red-500 line-through'
    : daysLeft <= 7 ? 'text-amber-600 font-medium'
    : 'text-zinc-700'

  const rowBg = striped ? 'bg-zinc-50/60' : 'bg-white'

  return (
    <tr
      onClick={onClick}
      className={`border-b border-zinc-100 cursor-pointer transition-colors hover:bg-blue-50/40 ${rowBg}`}
    >
      {/* Recommendation — primary signal */}
      <td className="px-4 py-2.5">
        {tender.recommendation ? (
          <RecommendationBadge recommendation={tender.recommendation} confidence={tender.confidence} />
        ) : (
          <RelevanceBadge status={tender.relevanceStatus} score={tender.relevanceScore} reason={tender.relevanceReason} />
        )}
      </td>
      {/* Match + Entry scores */}
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-0.5">
          {tender.matchScore !== null && (
            <span className="text-xs text-zinc-600 tabular-nums font-medium">M:{tender.matchScore}</span>
          )}
          {tender.entryLevel && (
            <span className={`text-[10px] font-medium ${
              tender.entryLevel === 'HIGH'   ? 'text-emerald-600' :
              tender.entryLevel === 'MEDIUM' ? 'text-amber-600' :
                                               'text-zinc-400'
            }`}>E:{tender.entryLevel}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 max-w-0">
        <span className="block truncate text-zinc-900 font-medium" title={tender.title}>{tender.title}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className="block truncate text-zinc-600 text-xs" title={tender.department}>{tender.department}</span>
      </td>
      <td className="px-4 py-2.5 text-zinc-600 text-xs whitespace-nowrap">{tender.state}</td>
      <td className="px-4 py-2.5">
        <span className="text-xs text-zinc-400 font-mono">{tender.tenderNumber ?? '—'}</span>
      </td>
      <td className={`px-4 py-2.5 text-xs whitespace-nowrap tabular-nums ${deadlineClass}`}>
        {deadline ? fmtDate(tender.closingDate!) : '—'}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-xs text-zinc-700 font-medium tabular-nums">{tender.budget ?? '—'}</span>
      </td>
      <td className="px-4 py-2.5"><PortalBadge portal={tender.portal} /></td>
      <td className="px-4 py-2.5 text-right text-xs text-zinc-300">→</td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  // Tender data
  const [tenders, setTenders] = useState<TenderRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [tendersLoading, setTendersLoading] = useState(true)
  const [tendersError, setTendersError] = useState<string | null>(null)

  // Scheduler
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const [recentRuns, setRecentRuns] = useState<ScraperRunRow[]>([])
  const [schedulerLoading, setSchedulerLoading] = useState(true)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  // AI
  const [aiStats, setAiStats] = useState<AIStats | null>(null)
  const [aiLoading, setAiLoading] = useState(true)
  const [aiRunning, setAiRunning] = useState(false)
  const [aiRunResult, setAiRunResult] = useState<string | null>(null)

  // Scraper
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0)

  // Table
  const [filters, setFilters] = useState<Filters>(INIT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('closingDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  // ── Fetch functions ──

  const fetchTenders = useCallback(async () => {
    setTendersLoading(true)
    setTendersError(null)
    try {
      const res = await fetch('/api/tenders')
      if (!res.ok) throw new Error('Failed to fetch tenders')
      const data = await res.json()
      setTenders(
        data.tenders.map((t: Record<string, unknown>) => ({
          ...t,
          publishedDate: t.publishedDate ? String(t.publishedDate) : null,
          closingDate: t.closingDate ? String(t.closingDate) : null,
          createdAt: String(t.createdAt),
          updatedAt: String(t.updatedAt),
        }))
      )
      setStats(data.stats)
    } catch (err) {
      setTendersError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTendersLoading(false)
    }
  }, [])

  const fetchScheduler = useCallback(async () => {
    setSchedulerLoading(true)
    try {
      const [statusRes, histRes] = await Promise.all([
        fetch('/api/scrape/status'),
        fetch('/api/scrape/history?limit=5'),
      ])
      if (statusRes.ok) setSchedulerStatus(await statusRes.json())
      if (histRes.ok) {
        const d = await histRes.json()
        setRecentRuns(d.runs)
      }
    } catch {
      // non-fatal
    } finally {
      setSchedulerLoading(false)
    }
  }, [])

  const fetchAI = useCallback(async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/stats')
      if (res.ok) setAiStats(await res.json())
    } catch {
      // non-fatal
    } finally {
      setAiLoading(false)
    }
  }, [])

  const fetchAll = useCallback(() => {
    fetchTenders()
    fetchScheduler()
    fetchAI()
  }, [fetchTenders, fetchScheduler, fetchAI])

  useEffect(() => { fetchAll() }, [fetchAll])

  function handleScrapeComplete() {
    setBannerRefreshKey((k) => k + 1)
    fetchTenders()
    fetchScheduler()
  }

  async function runAIBatch() {
    setAiRunning(true)
    setAiRunResult(null)
    try {
      const res = await fetch('/api/ai/relevance', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      const parts = [`Processed ${data.processed}`]
      if (data.matchScored > 0) parts.push(`Scored ${data.matchScored}`)
      if (data.skipped > 0) parts.push(`Skipped ${data.skipped}`)
      parts.push(`Relevant ${data.relevant}`, `Not relevant ${data.notRelevant}`, `Failed ${data.failed}`)
      setAiRunResult(parts.join(' · '))
      await fetchAI()
      await fetchTenders()
    } catch (err) {
      setAiRunResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setAiRunning(false)
    }
  }

  async function resetAIFailed() {
    try {
      const res = await fetch('/api/ai/reset', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setAiRunResult(`Reset: ${data.message}`)
      await fetchAI()
      await fetchTenders()
    } catch (err) {
      setAiRunResult(`Reset error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ── Filter / sort / paginate ──

  const portals = useMemo(() => unique(tenders.map((t) => t.portal)), [tenders])
  const states = useMemo(() => unique(tenders.map((t) => t.state)), [tenders])

  const filtered = useMemo(
    () => tenders.filter((t) => matchesFilter(t, filters)),
    [tenders, filters]
  )

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: val }))
    setPage(1)
  }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    (k === 'relevance' || k === 'recommendation') ? v !== 'all' : !!v
  ).length

  // ── Scheduler stats ──
  const lastRun = schedulerStatus?.lastCompletedRun
  const successRate = recentRuns.length > 0
    ? Math.round((recentRuns.filter((r) => r.status === 'SUCCESS' || r.status === 'PARTIAL_SUCCESS').length / recentRuns.length) * 100)
    : null

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-2xl mx-auto w-full px-6 py-5 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Government tender intelligence · live data
            {stats?.lastSchedulerRun && (
              <span className="ml-2 text-zinc-300">· Last sync {fmtRelative(stats.lastSchedulerRun)}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            disabled={tendersLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-3.5 h-3.5 ${tendersLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
          <ScrapeButton onComplete={handleScrapeComplete} />
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <StatCards stats={stats} loading={tendersLoading} />

      {/* ── Run Status Banner ── */}
      <RunStatusBanner refreshKey={bannerRefreshKey} onRunComplete={fetchTenders} />

      {/* ── Operational Status Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Scheduler panel */}
        <div className="bg-white border border-zinc-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Scheduler Status</h2>
            <Link href="/history" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
              View all history →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">Current</div>
              {schedulerLoading ? <Skeleton className="h-5 w-16" /> : (
                schedulerStatus?.isRunning
                  ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />Running</span>
                  : <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500"><span className="w-2 h-2 rounded-full bg-zinc-300" />Idle</span>
              )}
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">Last Run</div>
              {schedulerLoading ? <Skeleton className="h-4 w-20" /> : (
                <>
                  <div className="text-sm font-medium text-zinc-900">{fmtRelative(lastRun?.startedAt)}</div>
                  {lastRun && <div className="text-[11px] text-zinc-400 mt-0.5">+{lastRun.totalNew} new · {lastRun.totalFetched} fetched</div>}
                </>
              )}
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">Recent Runs</div>
              {schedulerLoading ? <Skeleton className="h-6 w-8" /> : (
                <div className="text-xl font-semibold text-zinc-900">{recentRuns.length === 5 ? '5+' : recentRuns.length}</div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide mb-1">Success Rate</div>
              {schedulerLoading ? <Skeleton className="h-6 w-12" /> : (
                <div className="text-xl font-semibold text-zinc-900">{successRate !== null ? `${successRate}%` : '—'}</div>
              )}
            </div>
          </div>
        </div>

        {/* AI panel */}
        <div className="bg-white border border-zinc-200 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">AI Status</h2>
            <div className="flex items-center gap-2">
              {(aiStats?.failed ?? 0) > 0 && (
                <button
                  onClick={resetAIFailed}
                  disabled={aiRunning}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  title="Reset failed tenders to PENDING for retry"
                >
                  Reset {aiStats!.failed} Failed
                </button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={runAIBatch}
                loading={aiRunning}
                disabled={aiRunning || !aiStats?.configured}
              >
                Run Batch Analysis
              </Button>
            </div>
          </div>
          {aiRunResult && (
            <div className={`mb-3 rounded px-3 py-2 text-xs font-medium border ${aiRunResult.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              {aiRunResult}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[11px] text-zinc-400 mb-0.5">Provider</div>
              <div className="text-sm font-medium text-zinc-900">{aiLoading ? <Skeleton className="h-4 w-16" /> : (aiStats?.provider ?? '—')}</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 mb-0.5">API Key</div>
              {aiLoading ? <Skeleton className="h-5 w-20" /> : (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${aiStats?.configured ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {aiStats?.configured ? '✓ Set' : '✗ Missing'}
                </span>
              )}
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 mb-0.5">Pending AI</div>
              <div className={`text-xl font-semibold ${(aiStats?.pending ?? 0) > 0 ? 'text-amber-600' : 'text-zinc-900'}`}>
                {aiLoading ? <Skeleton className="h-6 w-8" /> : (aiStats?.pending ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-400 mb-0.5">AI Failed</div>
              <div className={`text-xl font-semibold ${(aiStats?.failed ?? 0) > 0 ? 'text-red-600' : 'text-zinc-900'}`}>
                {aiLoading ? <Skeleton className="h-6 w-8" /> : (aiStats?.failed ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, number, department, portal, state…"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
            />
            {filters.search && (
              <button
                onClick={() => setFilter('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilters(INIT_FILTERS); setPage(1) }}
              className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Clear
            </button>
          )}

          {!tendersLoading && (
            <span className="text-xs text-zinc-400 ml-auto tabular-nums">
              {filtered.length.toLocaleString()} of {tenders.length.toLocaleString()} tenders
            </span>
          )}
        </div>

        {/* Quick recommendation tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {([
            { key: 'all',          label: 'All' },
            { key: 'PURSUE',       label: '✓ Pursue' },
            { key: 'MAYBE',        label: '? Maybe' },
            { key: 'DO_NOT_PURSUE', label: '✗ Pass' },
            { key: 'pending',      label: 'Pending AI' },
          ] as { key: RecommendationFilter; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setFilter('recommendation', key); setPage(1) }}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                filters.recommendation === key
                  ? key === 'PURSUE'        ? 'bg-emerald-600 text-white border-emerald-600'
                  : key === 'MAYBE'         ? 'bg-amber-500 text-white border-amber-500'
                  : key === 'DO_NOT_PURSUE' ? 'bg-red-500 text-white border-red-500'
                  :                           'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="bg-white border border-zinc-200 rounded p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1 font-medium uppercase tracking-wide">Portal</label>
              <select
                value={filters.portal}
                onChange={(e) => setFilter('portal', e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="">All portals</option>
                {portals.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1 font-medium uppercase tracking-wide">State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilter('state', e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="">All states</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1 font-medium uppercase tracking-wide">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilter('status', e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="">All</option>
                <option value="NEW">New</option>
                <option value="VIEWED">Viewed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1 font-medium uppercase tracking-wide">AI Status</label>
              <select
                value={filters.relevance}
                onChange={(e) => setFilter('relevance', e.target.value as RelevanceFilter)}
                className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="all">All</option>
                <option value="relevant">Relevant</option>
                <option value="not-relevant">Not Relevant</option>
                <option value="pending">Pending AI</option>
                <option value="failed">AI Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1 font-medium uppercase tracking-wide">Document</label>
              <select
                value={filters.documentStatus}
                onChange={(e) => setFilter('documentStatus', e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Tender Table ── */}
      <div className="bg-white border border-zinc-200 rounded overflow-hidden">
        {tendersError && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-red-500 mb-2">{tendersError}</p>
            <button onClick={fetchTenders} className="text-xs text-zinc-500 underline hover:text-zinc-900">Retry</button>
          </div>
        )}

        {!tendersError && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-[130px]">Recommendation</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-[72px]">Score</th>
                    <Th label="Title" sortKey="title" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <Th label="Department" sortKey="department" current={sortKey} dir={sortDir} onSort={handleSort} width="w-[200px]" />
                    <Th label="State" sortKey="state" current={sortKey} dir={sortDir} onSort={handleSort} width="w-[100px]" />
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide w-[140px]">Tender No.</th>
                    <Th label="Deadline" sortKey="closingDate" current={sortKey} dir={sortDir} onSort={handleSort} width="w-[96px]" />
                    <Th label="Budget" sortKey="budget" current={sortKey} dir={sortDir} onSort={handleSort} width="w-[120px]" align="right" />
                    <Th label="Portal" sortKey="portal" current={sortKey} dir={sortDir} onSort={handleSort} width="w-[80px]" />
                    <th className="px-4 py-2.5 w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {tendersLoading && Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      {Array.from({ length: 10 }).map((__, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))}

                  {!tendersLoading && sorted.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-sm text-zinc-400">
                        {tenders.length === 0 ? 'No tenders in database.' : 'No tenders match filters.'}
                      </td>
                    </tr>
                  )}

                  {!tendersLoading && pageData.map((tender, i) => (
                    <TenderTableRow
                      key={tender.id}
                      tender={tender}
                      striped={i % 2 === 1}
                      onClick={() => router.push(`/tenders/${tender.id}`)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {!tendersLoading && sorted.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={sorted.length}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            )}
          </>
        )}
      </div>

      {/* ── Recent Scraper Activity ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-900">Recent Scraper Activity</h2>
          <Link href="/history" className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
            View full history →
          </Link>
        </div>

        <div className="bg-white border border-zinc-200 rounded overflow-hidden">
          {schedulerLoading && (
            <div className="px-4 py-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20 ml-auto" />
                </div>
              ))}
            </div>
          )}

          {!schedulerLoading && recentRuns.length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-400">No scraper runs yet</div>
          )}

          {!schedulerLoading && recentRuns.length > 0 && (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Started</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Trigger</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Fetched</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">New</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Failed</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run, i) => (
                  <Fragment key={run.id}>
                    <tr
                      className={`border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors ${i % 2 === 1 ? 'bg-zinc-50/60' : ''}`}
                      onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                    >
                      <td className="px-4 py-2.5"><RunStatusBadge status={run.status} /></td>
                      <td className="px-4 py-2.5 text-xs text-zinc-600 whitespace-nowrap">{fmtDateTime(run.startedAt)}</td>
                      <td className="px-4 py-2.5 text-xs text-zinc-500 capitalize">{run.triggeredBy}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-700 tabular-nums font-medium">{run.totalFetched}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium text-emerald-700">+{run.totalNew}</td>
                      <td className="px-4 py-2.5 text-right text-xs tabular-nums text-red-500">{run.totalFailed > 0 ? run.totalFailed : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-zinc-300">{expandedRun === run.id ? '▲' : '▼'}</td>
                    </tr>
                    {expandedRun === run.id && (
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <td colSpan={8} className="px-4 py-3">
                          <PortalBreakdown run={run} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  )
}
