export type TenderStatus     = 'NEW' | 'VIEWED'
export type DocumentStatus   = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW'
export type RunStatus        = 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED'
export type RelevanceStatus  = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
export type Recommendation   = 'PURSUE' | 'MAYBE' | 'DO_NOT_PURSUE'
export type EligibilityStatus = 'ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'UNKNOWN' | 'NOT_ELIGIBLE'
export type Layer2Status     = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
export type ProposalDifficulty = 'LOW' | 'MEDIUM' | 'HIGH'
export type EntryLevel       = 'HIGH' | 'MEDIUM' | 'LOW'

// Pipeline stages — derived from status fields, never stored
export type PipelineStage =
  | 'SCRAPED'
  | 'DOCUMENT_PROCESSED'
  | 'MATCHED'
  | 'ELIGIBILITY_CHECKED'
  | 'AI_L1_COMPLETE'
  | 'AI_L2_COMPLETE'
  | 'RECOMMENDATION_READY'

export function getPipelineStage(t: {
  documentStatus:  DocumentStatus
  matchScore:      number | null
  eligibilityStatus: string | null
  relevanceStatus: RelevanceStatus
  aiLayer2Status:  string | null
  recommendation:  Recommendation | null
}): PipelineStage {
  if (t.recommendation)                                         return 'RECOMMENDATION_READY'
  if (t.aiLayer2Status && t.aiLayer2Status !== 'PENDING')       return 'AI_L2_COMPLETE'
  if (t.relevanceStatus === 'COMPLETED' || t.relevanceStatus === 'FAILED') return 'AI_L1_COMPLETE'
  if (t.eligibilityStatus)                                      return 'ELIGIBILITY_CHECKED'
  if (t.matchScore !== null)                                    return 'MATCHED'
  if (t.documentStatus !== 'PENDING')                           return 'DOCUMENT_PROCESSED'
  return 'SCRAPED'
}

export interface ParsedTender {
  portal:        string
  tenderNumber?: string
  title:         string
  department:    string
  state:         string
  publishedDate?: Date
  closingDate?:  Date
  budget?:       string
  emd?:          string
  description?:  string
  pdfUrl?:       string
  sourceUrl:     string
  rawHtml?:      string
}

export interface ScraperResult {
  portal:    string
  fetched:   number
  newCount:  number
  updated:   number
  skipped:   number
  failed:    number
  errors:    string[]
  warnings:  string[]
  durationMs: number
}

export interface TenderRow {
  id:            string
  portal:        string
  tenderNumber:  string | null
  title:         string
  department:    string
  state:         string
  publishedDate: string | null
  closingDate:   string | null
  budget:        string | null
  emd:           string | null
  description:   string | null
  pdfUrl:        string | null
  sourceUrl:     string
  status:        TenderStatus
  documentStatus: DocumentStatus
  documentSource: string | null
  relevanceStatus: RelevanceStatus
  isRelevant:    boolean | null
  relevanceScore: number | null
  relevanceReason: string | null
  // Match engine
  matchScore:      number | null
  matchKeywords:   string[]
  // Entry Opportunity Engine
  entryScore:      number | null
  entryLevel:      string | null
  entrySignals:    string[]
  // AI Layer 1 intelligence
  aiSummary:       string | null
  positiveFactors: string[]
  risks:           string[]
  missingInfo:     string[]
  whyWeCanWin:     string[]
  // Eligibility
  eligibilityStatus: string | null
  eligibilityScore:  number | null
  eligibilityNotes:  string | null
  // AI Layer 2
  aiLayer2Status:     string | null
  aiLayer2Summary:    string | null
  aiLayer2Deliverables: string[]
  aiLayer2Qualifications: string[]
  aiLayer2Concerns:   string[]
  aiLayer2Effort:     string | null
  aiLayer2Difficulty: string | null
  aiLayer2NextAction: string | null
  // Final recommendation
  recommendation:  Recommendation | null
  confidence:      number | null
  nextStep:        string | null
  intelligenceAt:  string | null
  createdAt:     string
  updatedAt:     string
}

export interface ScraperRunRow {
  id:              string
  status:          RunStatus
  triggeredBy:     string
  startedAt:       string
  completedAt:     string | null
  durationMs:      number | null
  totalFetched:    number
  totalNew:        number
  totalUpdated:    number
  totalSkipped:    number
  totalFailed:     number
  perPortalResults: ScraperResult[] | null
  errorSummary:    string | null
}

export interface ScrapeResponse {
  run?:          ScraperRunRow
  results:       ScraperResult[]
  totalFetched:  number
  totalNew:      number
  totalUpdated:  number
  totalSkipped:  number
  totalFailed:   number
  durationMs:    number
}

export interface ScrapeStatusResponse {
  isRunning:        boolean
  currentRun:       ScraperRunRow | null
  lastCompletedRun: ScraperRunRow | null
}
