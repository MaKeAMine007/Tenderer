import { ParsedTender, ScraperResult } from '@/types'

export interface PortalScraper {
  portal: string
  run(): Promise<ParsedTender[]>
}

export type { ParsedTender, ScraperResult }
