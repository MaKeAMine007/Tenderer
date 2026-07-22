'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/app/components/ui/Button'
import { StatusBadge, PortalBadge, RecommendationBadge, EligibilityBadge, PipelineStageBadge } from '@/app/components/ui/Badge'
import { Skeleton } from '@/app/components/ui/Skeleton'
import { getPipelineStage, type DocumentStatus, type RelevanceStatus, type Recommendation } from '@/types'

interface TenderDetail {
  id:               string
  portal:           string
  tenderNumber:     string | null
  title:            string
  department:       string
  state:            string
  publishedDate:    string | null
  closingDate:      string | null
  budget:           string | null
  emd:              string | null
  description:      string | null
  pdfUrl:           string | null
  sourceUrl:        string
  status:           'NEW' | 'VIEWED'
  documentStatus:   DocumentStatus
  relevanceStatus:  RelevanceStatus
  isRelevant:       boolean | null
  relevanceScore:   number | null
  relevanceReason:  string | null
  matchScore:       number | null
  matchKeywords:    string[]
  entryScore:       number | null
  entryLevel:       string | null
  entrySignals:     string[]
  aiSummary:        string | null
  positiveFactors:  string[]
  risks:            string[]
  missingInfo:      string[]
  whyWeCanWin:      string[]
  eligibilityStatus: string | null
  eligibilityScore: number | null
  eligibilityNotes: string | null
  aiLayer2Status:   string | null
  aiLayer2Summary:  string | null
  aiLayer2Deliverables: string[]
  aiLayer2Qualifications: string[]
  aiLayer2Concerns: string[]
  aiLayer2Effort:   string | null
  aiLayer2Difficulty: string | null
  aiLayer2NextAction: string | null
  recommendation:   Recommendation | null
  confidence:       number | null
  nextStep:         string | null
  intelligenceAt:   string | null
  createdAt:        string
  updatedAt:        string
}

export default function TenderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [tender, setTender] = useState<TenderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [marking, setMarking] = useState(false)
  const [runningAI, setRunningAI] = useState(false)
  const [aiMsg, setAiMsg] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/tenders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Tender not found')
        return res.json()
      })
      .then((data) => setTender(data.tender))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markViewed() {
    if (!tender || tender.status === 'VIEWED') return
    setMarking(true)
    try {
      const res  = await fetch(`/api/tenders/${id}/viewed`, { method: 'PATCH' })
      const data = await res.json()
      setTender((t) => t ? { ...t, status: data.tender.status } : t)
    } catch { /* ignore */ } finally { setMarking(false) }
  }

  async function triggerAI() {
    setRunningAI(true)
    setAiMsg(null)
    try {
      const res  = await fetch(`/api/ai/relevance/${id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setAiMsg(`AI complete — ${data.recommendation ?? 'analysed'}`)
      load()
    } catch (err) {
      setAiMsg(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally { setRunningAI(false) }
  }

  if (loading) return <DetailSkeleton />
  if (error || !tender) return <DetailError error={error} onBack={() => router.back()} />

  const deadline  = tender.closingDate ? new Date(tender.closingDate) : null
  const now       = new Date()
  const daysLeft  = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / 86400000) : null
  const isExpired = daysLeft !== null && daysLeft < 0

  const stage = getPipelineStage({
    documentStatus:    tender.documentStatus,
    matchScore:        tender.matchScore,
    eligibilityStatus: tender.eligibilityStatus,
    relevanceStatus:   tender.relevanceStatus,
    aiLayer2Status:    tender.aiLayer2Status,
    recommendation:    tender.recommendation,
  })

  const hasIntelligence = tender.recommendation || tender.aiSummary || tender.matchScore !== null
  const hasLayer2       = tender.aiLayer2Status === 'COMPLETED' && tender.aiLayer2Summary

  return (
    <div className="flex flex-col">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-zinc-100 px-6 py-2.5">
        <div className="max-w-screen-xl mx-auto flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <span className="text-zinc-300">/</span>
          <span className="text-xs text-zinc-500 truncate max-w-md">{tender.title}</span>
          <span className="ml-auto"><PipelineStageBadge stage={stage} /></span>
        </div>
      </div>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6 space-y-5">

        {/* ── Title + badges ── */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <StatusBadge status={tender.status} />
            <PortalBadge portal={tender.portal} />
            {tender.recommendation && (
              <RecommendationBadge recommendation={tender.recommendation} confidence={tender.confidence} size="lg" />
            )}
            {tender.eligibilityStatus && (
              <EligibilityBadge status={tender.eligibilityStatus} />
            )}
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 leading-snug">{tender.title}</h1>
          {(tender.matchScore !== null || tender.entryLevel) && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {tender.matchScore !== null && (
                <p className="text-xs text-zinc-400">
                  Match: <span className="font-medium text-zinc-600">{tender.matchScore}/100</span>
                  {tender.matchKeywords?.length > 0 && (
                    <span className="ml-1">· {tender.matchKeywords.slice(0, 4).join(', ')}</span>
                  )}
                </p>
              )}
              {tender.entryLevel && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  tender.entryLevel === 'HIGH'   ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  tender.entryLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                    'bg-zinc-100 text-zinc-500 border-zinc-200'
                }`}>
                  Entry: {tender.entryLevel}
                </span>
              )}
              {tender.entryScore !== null && (
                <span className="text-xs text-zinc-400">Entry score: {tender.entryScore}/100</span>
              )}
            </div>
          )}
        </div>

        {/* AI message feedback */}
        {aiMsg && (
          <div className={`rounded px-4 py-3 text-xs font-medium border ${aiMsg.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {aiMsg}
          </div>
        )}

        {/* ── Intelligence panel (primary business output) ── */}
        {hasIntelligence && (
          <div className="bg-white border border-zinc-200 rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Intelligence Report</span>
              {tender.intelligenceAt && (
                <span className="text-[10px] text-zinc-400">Updated {fmtDateTime(tender.intelligenceAt)}</span>
              )}
            </div>

            {/* AI Summary */}
            {tender.aiSummary && (
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-sm text-zinc-700 leading-relaxed">{tender.aiSummary}</p>
              </div>
            )}

            {/* Why We Can Win */}
            {tender.whyWeCanWin?.length > 0 && (
              <div className="px-5 py-4 border-b border-zinc-100 bg-emerald-50/40">
                <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide mb-2">Why We Can Win</div>
                <ul className="space-y-1.5">
                  {tender.whyWeCanWin.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-emerald-800">
                      <span className="text-emerald-600 mt-0.5 shrink-0 font-bold">✓</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entry opportunity signals */}
            {tender.entrySignals?.length > 0 && (
              <div className="px-5 py-3 border-b border-zinc-100">
                <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-2">Entry Opportunity Signals</div>
                <div className="flex flex-wrap gap-1.5">
                  {tender.entrySignals.map((s, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Three-column: factors / risks / missing */}
            {(tender.positiveFactors?.length > 0 || tender.risks?.length > 0 || tender.missingInfo?.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
                {/* Positive factors */}
                <div className="px-5 py-4">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-2">Positive Factors</div>
                  {tender.positiveFactors?.length > 0 ? (
                    <ul className="space-y-1.5">
                      {tender.positiveFactors.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">None identified</p>
                  )}
                </div>

                {/* Risks */}
                <div className="px-5 py-4">
                  <div className="text-[11px] font-semibold text-red-600 uppercase tracking-wide mb-2">Risks</div>
                  {tender.risks?.length > 0 ? (
                    <ul className="space-y-1.5">
                      {tender.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">None identified</p>
                  )}
                </div>

                {/* Missing info */}
                <div className="px-5 py-4">
                  <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide mb-2">Missing Info</div>
                  {tender.missingInfo?.length > 0 ? (
                    <ul className="space-y-1.5">
                      {tender.missingInfo.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                          <span className="text-amber-500 mt-0.5 shrink-0">?</span>
                          {m}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No gaps identified</p>
                  )}
                </div>
              </div>
            )}

            {/* Next step */}
            {tender.nextStep && (
              <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Recommended Next Step: </span>
                <span className="text-xs text-zinc-700">{tender.nextStep}</span>
              </div>
            )}

            {/* Eligibility detail */}
            {tender.eligibilityNotes && (
              <div className="px-5 py-3 border-t border-zinc-100 flex items-start gap-3">
                <EligibilityBadge status={tender.eligibilityStatus} />
                <p className="text-xs text-zinc-600">{tender.eligibilityNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* ── AI Layer 2 deep analysis ── */}
        {hasLayer2 && (
          <div className="bg-white border border-zinc-200 rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Deep Analysis (AI Layer 2)</span>
              {tender.aiLayer2Difficulty && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded border ${
                  tender.aiLayer2Difficulty === 'LOW'    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  tender.aiLayer2Difficulty === 'HIGH'   ? 'bg-red-50 text-red-600 border-red-100' :
                                                           'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {tender.aiLayer2Difficulty} difficulty
                </span>
              )}
            </div>

            {tender.aiLayer2Summary && (
              <div className="px-5 py-4 border-b border-zinc-100">
                <p className="text-sm text-zinc-700 leading-relaxed">{tender.aiLayer2Summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
              <div className="px-5 py-4">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Deliverables</div>
                {tender.aiLayer2Deliverables?.length > 0 ? (
                  <ul className="space-y-1">
                    {tender.aiLayer2Deliverables.map((d, i) => (
                      <li key={i} className="text-xs text-zinc-700 flex items-start gap-1.5">
                        <span className="text-zinc-300 shrink-0">•</span>{d}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-zinc-400 italic">Not extracted</p>}
              </div>

              <div className="px-5 py-4">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Qualifications Required</div>
                {tender.aiLayer2Qualifications?.length > 0 ? (
                  <ul className="space-y-1">
                    {tender.aiLayer2Qualifications.map((q, i) => (
                      <li key={i} className="text-xs text-zinc-700 flex items-start gap-1.5">
                        <span className="text-zinc-300 shrink-0">•</span>{q}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-zinc-400 italic">Not extracted</p>}
              </div>

              <div className="px-5 py-4">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Concerns</div>
                {tender.aiLayer2Concerns?.length > 0 ? (
                  <ul className="space-y-1">
                    {tender.aiLayer2Concerns.map((c, i) => (
                      <li key={i} className="text-xs text-zinc-700 flex items-start gap-1.5">
                        <span className="text-amber-400 shrink-0">⚠</span>{c}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-zinc-400 italic">None identified</p>}
              </div>
            </div>

            {(tender.aiLayer2Effort || tender.aiLayer2NextAction) && (
              <div className="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex flex-wrap gap-4">
                {tender.aiLayer2Effort && (
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Estimated Effort: </span>
                    <span className="text-xs text-zinc-700">{tender.aiLayer2Effort}</span>
                  </div>
                )}
                {tender.aiLayer2NextAction && (
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Next Action: </span>
                    <span className="text-xs text-zinc-700">{tender.aiLayer2NextAction}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Two-column: metadata + description ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left — metadata */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-zinc-200 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tender Details</span>
              </div>
              <div className="divide-y divide-zinc-100">
                <DetailRow label="Department"    value={tender.department} />
                <DetailRow label="Tender Number" value={tender.tenderNumber} mono />
                <DetailRow label="Portal"        value={<PortalBadge portal={tender.portal} />} />
                <DetailRow label="State"         value={tender.state} />
                <DetailRow label="Published"     value={tender.publishedDate ? fmtDate(tender.publishedDate) : undefined} />
                <DetailRow
                  label="Deadline"
                  value={
                    deadline ? (
                      <span className={isExpired ? 'text-red-500' : daysLeft! <= 7 ? 'text-amber-600 font-medium' : undefined}>
                        {fmtDate(tender.closingDate!)}
                        <span className="ml-1 text-xs text-zinc-400">
                          {isExpired ? '(expired)' : `(${daysLeft}d left)`}
                        </span>
                      </span>
                    ) : undefined
                  }
                />
                <DetailRow label="Budget" value={tender.budget} />
                <DetailRow label="EMD"    value={tender.emd} />
                <DetailRow label="Added"  value={fmtDate(tender.createdAt)} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {tender.status === 'NEW' && (
                <Button variant="primary" onClick={markViewed} loading={marking} disabled={marking}>
                  Mark as Viewed
                </Button>
              )}
              {tender.status === 'VIEWED' && (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 border border-zinc-100 rounded bg-zinc-50">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Marked as viewed
                </div>
              )}
              {tender.sourceUrl && (
                <a
                  href={tender.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-white text-zinc-800 border border-zinc-200 rounded hover:bg-zinc-50 transition-colors"
                >
                  Open Original Tender
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}
              {tender.pdfUrl && (
                <a
                  href={tender.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-white text-zinc-800 border border-zinc-200 rounded hover:bg-zinc-50 transition-colors"
                >
                  Download Tender PDF
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </a>
              )}

              {/* AI re-analysis button */}
              {(tender.relevanceStatus === 'PENDING' || tender.relevanceStatus === 'FAILED') && (
                <Button variant="primary" onClick={triggerAI} loading={runningAI} disabled={runningAI}>
                  {tender.relevanceStatus === 'FAILED' ? 'Retry AI Analysis' : 'Run AI Analysis'}
                </Button>
              )}
            </div>
          </div>

          {/* Right — description */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-zinc-200 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Description</span>
              </div>
              <div className="px-4 py-4">
                {tender.description ? (
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{tender.description}</p>
                ) : (
                  <p className="text-sm text-zinc-400 italic">No description available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Pipeline status ── */}
        <div className="bg-white border border-zinc-200 rounded px-5 py-4">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Processing Pipeline</div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Scraped',               done: true },
              { label: 'Document',              done: tender.documentStatus !== 'PENDING' },
              { label: 'Match Scored',          done: tender.matchScore !== null },
              { label: 'Eligibility',           done: !!tender.eligibilityStatus },
              { label: 'AI Layer 1',            done: tender.relevanceStatus === 'COMPLETED' || tender.relevanceStatus === 'FAILED' },
              { label: 'AI Layer 2',            done: !!tender.aiLayer2Status && tender.aiLayer2Status !== 'PENDING' },
              { label: 'Recommendation',        done: !!tender.recommendation },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-zinc-200 text-xs">→</span>}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  step.done
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                }`}>
                  {step.done ? '✓' : '○'} {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode | undefined; mono?: boolean }) {
  return (
    <div className="flex items-start px-4 py-2.5 gap-4">
      <span className="text-xs text-zinc-400 shrink-0 w-28 pt-px">{label}</span>
      <span className={`text-sm text-zinc-800 min-w-0 ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? <span className="text-zinc-300">—</span>}
      </span>
    </div>
  )
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function DetailSkeleton() {
  return (
    <div className="min-h-full max-w-screen-xl mx-auto px-6 py-6 space-y-5">
      <Skeleton className="h-6 w-2/3" />
      <div className="bg-white border border-zinc-200 rounded p-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-2 bg-white border border-zinc-200 rounded p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
        <div className="col-span-3 bg-white border border-zinc-200 rounded p-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    </div>
  )
}

function DetailError({ error, onBack }: { error: string | null; onBack: () => void }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
      <p className="text-sm font-medium text-zinc-700">Unable to load tender</p>
      <p className="text-xs text-zinc-400">{error ?? 'Tender not found'}</p>
      <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-900 underline transition-colors">
        Go back
      </button>
    </div>
  )
}
