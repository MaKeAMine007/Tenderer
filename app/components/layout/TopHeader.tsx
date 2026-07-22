'use client'

import { usePathname } from 'next/navigation'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tenders': 'Tenders',
  '/documents': 'Documents',
  '/ai': 'AI',
  '/analytics': 'Analytics',
  '/scheduler': 'Scheduler',
  '/scraper-health': 'Scraper Health',
  '/settings': 'Settings',
  '/history': 'Scrape History',
}

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/tenders/')) return 'Tender Detail'
  return 'MAM Intelligence'
}

export function TopHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center px-6 shrink-0">
      {/* Mobile: show logo (sidebar hidden on mobile) */}
      <div className="flex items-center gap-3 lg:hidden">
        <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-zinc-900">MAM Intelligence</span>
      </div>

      {/* Desktop: page title */}
      <div className="hidden lg:flex items-center">
        <h1 className="text-sm font-semibold text-zinc-900">{title}</h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400 hidden sm:inline">MAM Tender Intelligence System</span>
      </div>
    </header>
  )
}
