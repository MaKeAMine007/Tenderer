import { Skeleton } from '@/app/components/ui/Skeleton'

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

interface StatCardsProps {
  stats:   Stats | null
  loading?: boolean
}

function StatCard({
  label, value, loading, accent, warn, danger, success, sub,
}: {
  label:    string
  value:    string | number
  loading?: boolean
  accent?:  boolean
  warn?:    boolean
  danger?:  boolean
  success?: boolean
  sub?:     string
}) {
  const valueColor =
    danger  ? 'text-red-600'     :
    warn    ? 'text-amber-600'   :
    success ? 'text-emerald-600' :
    accent  ? 'text-blue-600'    :
              'text-zinc-900'

  return (
    <div className="bg-white border border-zinc-200 rounded px-4 py-3 flex flex-col gap-1 min-w-0">
      <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide whitespace-nowrap">
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-6 w-12 mt-0.5" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xl font-semibold tabular-nums leading-none ${valueColor}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {sub && <span className="text-[10px] text-zinc-400 truncate">{sub}</span>}
        </div>
      )}
    </div>
  )
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function StatCards({ stats, loading }: StatCardsProps) {
  const pursue  = stats?.pursue  ?? 0
  const maybe   = stats?.maybe   ?? 0
  const pending = stats?.pendingAI ?? 0
  const failed  = stats?.aiFailed  ?? 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
      {/* Primary intelligence outputs — most important */}
      <StatCard label="Pursue"   value={pursue}  loading={loading} success={pursue > 0} />
      <StatCard label="Maybe"    value={maybe}   loading={loading} warn={maybe > 0} />
      <StatCard label="Eligible" value={stats?.eligible ?? 0} loading={loading} accent />

      {/* Processing health */}
      <StatCard label="Pending AI" value={pending} loading={loading} warn={pending > 0} />
      <StatCard label="AI Failed"  value={failed}  loading={loading} danger={failed > 0} />

      {/* Urgency */}
      <StatCard label="Closing Today"      value={stats?.closingToday    ?? 0} loading={loading} danger={!!stats && (stats?.closingToday ?? 0) > 0} />
      <StatCard label="Closing This Week"  value={stats?.closingThisWeek ?? 0} loading={loading} warn={!!stats && (stats?.closingThisWeek ?? 0) > 0} />

      {/* Volume */}
      <StatCard label="New"    value={stats?.newCount ?? 0} loading={loading} accent />
      <StatCard label="Total"  value={stats?.total    ?? 0} loading={loading} />

      {/* System health */}
      <StatCard
        label="Last Sync"
        value={loading ? '—' : formatRelative(stats?.lastSchedulerRun)}
        loading={false}
      />
    </div>
  )
}
