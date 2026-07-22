import {
  CompanyProfile,
  MAM_COMPANY_PROFILE,
  BudgetRange,
  TeamCapability,
} from '@/config/company-profile'

export function getCompanyProfile(): CompanyProfile {
  return MAM_COMPANY_PROFILE
}

export function getKeywords(): string[] {
  return MAM_COMPANY_PROFILE.keywords
}

export function getExclusionKeywords(): string[] {
  return MAM_COMPANY_PROFILE.exclusionKeywords
}

export function getPreferredStates(): string[] {
  return MAM_COMPANY_PROFILE.preferredStates
}

export function getBudgetRange(): BudgetRange {
  return MAM_COMPANY_PROFILE.budgetRange
}

export function getTeamCapabilities(): TeamCapability[] {
  return MAM_COMPANY_PROFILE.teamCapabilities
}

export function getPreferredCategories(): string[] {
  return MAM_COMPANY_PROFILE.preferredProjectCategories
}

export function getGovernmentEntryContext() {
  return MAM_COMPANY_PROFILE.governmentEntryContext
}

/**
 * Builds a compact plain-text summary for embedding in AI prompts.
 * AI services should call this instead of serialising the full profile object.
 */
export function buildProfileSummary(): string {
  const p = MAM_COMPANY_PROFILE
  const entry = p.governmentEntryContext

  const budgetStr = p.budgetRange.preferredMinINR && p.budgetRange.preferredMaxINR
    ? `₹${(p.budgetRange.preferredMinINR / 100_000).toFixed(0)}L – ₹${(p.budgetRange.preferredMaxINR / 10_000_000).toFixed(0)}Cr (preferred)`
    : 'Not specified'

  return [
    `Company: ${p.name} (${p.shortName})`,
    `Description: ${p.description}`,
    '',
    `Core Services: ${p.coreServices.join('; ')}`,
    `Technologies: ${p.technologies.join('; ')}`,
    `Industries Served: ${p.industriesServed.join('; ')}`,
    '',
    `Preferred Project Categories: ${p.preferredProjectCategories.join(', ')}`,
    `Preferred States: ${p.preferredStates.join(', ')}`,
    `Budget Range: ${budgetStr}`,
    '',
    `Relevant Keywords: ${p.keywords.join(', ')}`,
    `Exclusion Keywords (not relevant): ${p.exclusionKeywords.join(', ')}`,
    '',
    `Ideal Clients: ${p.idealClients.join('; ')}`,
    `Typical Deliverables: ${p.typicalDeliverables.join('; ')}`,
    '',
    `Certifications: ${p.certifications.join(', ')}`,
    '',
    `Government Entry Context: ${entry.note}`,
    `MSME Registered: ${entry.msmeRegistered ? 'Yes' : 'No'}`,
    `Startup India: ${entry.startupIndia ? 'Yes' : 'No'}`,
    `Prior Government Experience: ${entry.govExperience ? 'Yes' : 'No — entering government market'}`,
    p.notes ? `Notes: ${p.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
