'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { TenderRow } from '@/types'
import { StatusBadge, PortalBadge, RecommendationBadge, EligibilityBadge } from '@/app/components/ui/Badge'
import { TableRowSkeleton } from '@/app/components/ui/Skeleton'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { Pagination } from './Pagination'

type SortKey = keyof Pick<
  TenderRow,
  'title' | 'department' | 'state' | 'publishedDate' | 'closingDate' | 'budget' | 'portal' | 'status' | 'matchScore' | 'confidence'
>

interface TenderTableProps {
  tenders:       TenderRow[]
  loading:       boolean
  error:         string | null
  onRetry:       () => void
  onRunScraper:  () => void
  scrapingActive: boolean
}

const PAGE_SIZE = 50

type DecisionFilter = 'all' | 'pursue' | 'maybe' | 'pass' | 'pending' | 'failed'

const DECISION_FILTERS: { key: DecisionFilter; label: string }[] = [
  { key: 'all',     label: 'All'     },
  { key: 'pursue',  label: '▲ Pursue' },
  { key: 'maybe',   label: '◈ Maybe'  },
  { key: 'pass',    label: '✕ Pass'   },
  { key: 'pending', label: 'Pending'  },
  { key: 'failed',  label: 'Failed'   },
]

function matchesFilter(tender: TenderRow, filter: DecisionFilter): boolean {
  switch (filter) {
    case 'pursue':  return tender.recommendation === 'PURSUE'
    case 'maybe':   return tender.recommendation === 'MAYBE'
    case 'pass':    return tender.recommendation === 'DO_NOT_PURSUE'
    case 'pending': return tender.relevanceStatus === 'PENDING' || tender.relevanceStatus === 'PROCESSING'
    case 'failed':  return tender.relevanceStatus === 'FAILED'
    default:        return true
  }
}

function filterCount(tenders: TenderRow[], filter: DecisionFilter): number {
  if (filter === 'all') return tenders.length
  return tenders.filter((t) => matchesFilter(t, filter)).length
}

export function TenderTable({
  tenders,
  loading,
  error,
  onRetry,
  onRunScraper,
  scrapingActive,
}: TenderTableProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('closingDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<DecisionFilter>('all')

  const filtered = useMemo(
    () => tenders.filter((t) => matchesFilter(t, filter)),
    [tenders, filter]
  )

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function handleFilter(f: DecisionFilter) {
    setFilter(f)
    setPage(1)
  }

  return (
    <div className="bg-white border border-zinc-200 rounded overflow-hidden">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-zinc-100 flex-wrap">
        {DECISION_FILTERS.map(({ key, label }) => {
          const count  = filterCount(tenders, key)
          const active = filter === key
          return (
            <button
              key={key}
              onClick={() => handleFilter(key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`tabular-nums ${active ? 'text-zinc-300' : 'text-zinc-400'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap w-[100px]">
                Decision
              </th>
              <Th label="Match" sortKey="matchScore"  current={sortKey} dir={sortDir} onSort={handleSort} width="w-[60px]" align="right" />
              <th className="px-4 py-2.5 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap w-[100px]">
                Eligibility
              </th>
              <Th label="Title"      sortKey="title"        current={sortKey} dir={sortDir} onSort={handleSort} />
              <Th label="Department" sortKey="department"   current={sortKey} dir={sortDir} onSort={handleSort} width="w-[160px]" />
              <Th label="State"      sortKey="state"        current={sortKey} dir={sortDir} onSort={handleSort} width="w-[90px]" />
              <Th label="Deadline"   sortKey="closingDate"  current={sortKey} dir={sortDir} onSort={handleSort} width="w-[96px]" />
              <Th label="Budget"     sortKey="budget"       current={sortKey} dir={sortDir} onSort={handleSort} width="w-[110px]" align="right" />
              <Th label="Portal"     sortKey="portal"       current={sortKey} dir={sortDir} onSort={handleSort} width="w-[80px]" />
              <Th label="Status"     sortKey="status"       current={sortKey} dir={sortDir} onSort={handleSort} width="w-[80px]" />
              <th className="px-4 py-2.5 w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)}

            {!loading && error && <ErrorState message={error} onRetry={onRetry} />}

            {!loading && !error && filtered.length === 0 && tenders.length > 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-sm text-zinc-400">
                  No tenders match this filter.
                </td>
              </tr>
            )}

            {!loading && !error && tenders.length === 0 && (
              <EmptyState onRunScraper={onRunScraper} loading={scrapingActive} />
            )}

            {!loading && !error && pageData.map((tender, i) => (
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

      {!loading && !error && filtered.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={sorted.length}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}
    </div>
  )
}

function Th({
  label, sortKey, current, dir, onSort, width = '', align = 'left',
}: {
  label:   string
  sortKey: SortKey
  current: SortKey
  dir:     'asc' | 'desc'
  onSort:  (k: SortKey) => void
  width?:  string
  align?:  'left' | 'right'
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
  const deadline  = tender.closingDate ? new Date(tender.closingDate) : null
  const daysLeft  = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null
  const deadlineCls =
    daysLeft === null    ? 'text-zinc-400'
    : daysLeft < 0       ? 'text-red-500 line-through'
    : daysLeft <= 7      ? 'text-amber-600 font-medium'
    :                      'text-zinc-700'

  // Row highlight based on recommendation
  const rowHighlight =
    tender.recommendation === 'PURSUE'
      ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
      : tender.recommendation === 'MAYBE'
      ? 'bg-amber-50/20 hover:bg-amber-50/40'
      : striped
      ? 'bg-zinc-50/60 hover:bg-blue-50/30'
      : 'bg-white hover:bg-blue-50/30'

  return (
    <tr onClick={onClick} className={`border-b border-zinc-100 cursor-pointer transition-colors ${rowHighlight}`}>
      <td className="px-4 py-2.5">
        <RecommendationBadge recommendation={tender.recommendation} confidence={tender.confidence} />
      </td>
      <td className="px-4 py-2.5 text-right">
        {tender.matchScore !== null ? (
          <span className={`text-xs tabular-nums font-medium ${
            tender.matchScore >= 60 ? 'text-emerald-700' :
            tender.matchScore >= 30 ? 'text-amber-700' :
            'text-zinc-400'
          }`}>
            {tender.matchScore}
          </span>
        ) : (
          <span className="text-xs text-zinc-300">—</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <EligibilityBadge status={tender.eligibilityStatus} />
      </td>
      <td className="px-4 py-2.5 max-w-0">
        <div className="truncate text-zinc-900 font-medium text-sm" title={tender.title}>
          {tender.title}
        </div>
        {tender.aiSummary && (
          <div className="truncate text-zinc-400 text-xs mt-0.5" title={tender.aiSummary}>
            {tender.aiSummary}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="block truncate text-zinc-600 text-xs" title={tender.department}>
          {tender.department}
        </span>
      </td>
      <td className="px-4 py-2.5 text-zinc-600 text-xs whitespace-nowrap">{tender.state}</td>
      <td className={`px-4 py-2.5 text-xs whitespace-nowrap tabular-nums ${deadlineCls}`}>
        {deadline ? fmtDate(tender.closingDate!) : '—'}
      </td>
      <td className="px-4 py-2.5 text-right text-xs text-zinc-700 font-medium tabular-nums">
        {tender.budget ?? '—'}
      </td>
      <td className="px-4 py-2.5"><PortalBadge portal={tender.portal} /></td>
      <td className="px-4 py-2.5"><StatusBadge status={tender.status} /></td>
      <td className="px-4 py-2.5 text-right text-xs text-zinc-300">→</td>
    </tr>
  )
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}
