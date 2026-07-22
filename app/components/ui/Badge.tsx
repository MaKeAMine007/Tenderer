import { TenderStatus, RelevanceStatus, Recommendation } from '@/types'

// ── Status Badge ──────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: TenderStatus }) {
  if (status === 'NEW') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
        New
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
      Viewed
    </span>
  )
}

// ── Recommendation Badge ──────────────────────────────────────────────────────

const REC_STYLES: Record<string, string> = {
  PURSUE:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  MAYBE:          'bg-amber-50  text-amber-700  border-amber-200',
  DO_NOT_PURSUE:  'bg-red-50    text-red-600    border-red-100',
}
const REC_LABELS: Record<string, string> = {
  PURSUE:         'Pursue',
  MAYBE:          'Maybe',
  DO_NOT_PURSUE:  'Pass',
}
const REC_ICONS: Record<string, string> = {
  PURSUE:         '▲',
  MAYBE:          '◈',
  DO_NOT_PURSUE:  '✕',
}

export function RecommendationBadge({
  recommendation,
  confidence,
  size = 'sm',
}: {
  recommendation: Recommendation | string | null | undefined
  confidence?: number | null
  size?: 'sm' | 'lg'
}) {
  if (!recommendation) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-400 border border-zinc-200">
        —
      </span>
    )
  }

  const style = REC_STYLES[recommendation] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'
  const label = REC_LABELS[recommendation] ?? recommendation
  const icon  = REC_ICONS[recommendation]  ?? '·'

  if (size === 'lg') {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold border ${style}`}>
        <span>{icon}</span>
        {label}
        {confidence != null && (
          <span className="text-xs font-normal opacity-70">{confidence}%</span>
        )}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${style}`}
      title={confidence != null ? `${confidence}% confidence` : undefined}
    >
      {icon} {label}
    </span>
  )
}

// ── Eligibility Badge ─────────────────────────────────────────────────────────

const ELIG_STYLES: Record<string, string> = {
  ELIGIBLE:         'bg-emerald-50 text-emerald-700 border-emerald-200',
  LIKELY_ELIGIBLE:  'bg-blue-50    text-blue-700    border-blue-100',
  UNKNOWN:          'bg-zinc-100   text-zinc-500    border-zinc-200',
  NOT_ELIGIBLE:     'bg-red-50     text-red-600     border-red-100',
}
const ELIG_LABELS: Record<string, string> = {
  ELIGIBLE:         'Eligible',
  LIKELY_ELIGIBLE:  'Likely Eligible',
  UNKNOWN:          'Unknown',
  NOT_ELIGIBLE:     'Not Eligible',
}

export function EligibilityBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-400 border border-zinc-200">
        —
      </span>
    )
  }
  const style = ELIG_STYLES[status] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'
  const label = ELIG_LABELS[status] ?? status
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  )
}

// ── AI Score / Relevance Badge ────────────────────────────────────────────────

export function RelevanceBadge({
  status,
  score,
  reason,
}: {
  status: RelevanceStatus
  score?: number | null
  reason?: string | null
}) {
  if (status === 'COMPLETED' && score !== null && score !== undefined) {
    const isRelevant = score >= 5
    const colors = isRelevant
      ? 'bg-green-50 text-green-700 border-green-100'
      : 'bg-red-50 text-red-600 border-red-100'
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${colors} cursor-default`}
        title={reason ?? undefined}
      >
        {isRelevant ? '✓' : '✗'} {score}
      </span>
    )
  }

  if (status === 'PROCESSING') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-500 border border-blue-100">
        …
      </span>
    )
  }

  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
        !
      </span>
    )
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-400 border border-zinc-200">
      —
    </span>
  )
}

// ── Portal Badge ──────────────────────────────────────────────────────────────

const PORTAL_COLORS: Record<string, string> = {
  CPPP:    'bg-violet-50  text-violet-700  border-violet-100',
  UP:      'bg-emerald-50 text-emerald-700 border-emerald-100',
  Delhi:   'bg-orange-50  text-orange-700  border-orange-100',
  Haryana: 'bg-cyan-50    text-cyan-700    border-cyan-100',
  Demo:    'bg-zinc-100   text-zinc-500    border-zinc-200',
}

export function PortalBadge({ portal }: { portal: string }) {
  const colors = PORTAL_COLORS[portal] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors}`}>
      {portal}
    </span>
  )
}

// ── Pipeline Stage Badge ──────────────────────────────────────────────────────

const STAGE_STYLES: Record<string, string> = {
  SCRAPED:              'bg-zinc-100   text-zinc-500',
  DOCUMENT_PROCESSED:   'bg-zinc-100   text-zinc-600',
  MATCHED:              'bg-blue-50    text-blue-600',
  ELIGIBILITY_CHECKED:  'bg-indigo-50  text-indigo-600',
  AI_L1_COMPLETE:       'bg-violet-50  text-violet-700',
  AI_L2_COMPLETE:       'bg-purple-50  text-purple-700',
  RECOMMENDATION_READY: 'bg-emerald-50 text-emerald-700',
}
const STAGE_LABELS: Record<string, string> = {
  SCRAPED:              'Scraped',
  DOCUMENT_PROCESSED:   'Docs Processed',
  MATCHED:              'Matched',
  ELIGIBILITY_CHECKED:  'Eligibility Checked',
  AI_L1_COMPLETE:       'AI L1 Done',
  AI_L2_COMPLETE:       'AI L2 Done',
  RECOMMENDATION_READY: 'Ready',
}

export function PipelineStageBadge({ stage }: { stage: string }) {
  const style = STAGE_STYLES[stage] ?? 'bg-zinc-100 text-zinc-400'
  const label = STAGE_LABELS[stage] ?? stage
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${style}`}>
      {label}
    </span>
  )
}
