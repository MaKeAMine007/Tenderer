'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from './sidebar-context'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

const NAV: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: '/documents',
    label: 'Documents',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: '/scraper-health',
    label: 'Scraper Health',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-1.5a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 14.25v1.5A2.25 2.25 0 003.75 18z" />
      </svg>
    ),
  },
]

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

function ChevronLeftIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={`
        hidden lg:flex flex-col bg-zinc-900 shrink-0 min-h-0
        transition-[width] duration-200 ease-in-out
        ${collapsed ? 'w-[56px]' : 'w-[220px]'}
      `}
    >
      {/* Brand */}
      <div className={`h-14 flex items-center border-b border-zinc-800 shrink-0 overflow-hidden ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-4'}`}>
        <div className="w-6 h-6 bg-zinc-100 rounded flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <div className="text-xs font-semibold text-white truncate">MAM Intelligence</div>
            <div className="text-[10px] text-zinc-500 leading-none mt-0.5">Tender Platform</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible py-3 px-2 space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact)

          if (collapsed) {
            return (
              <div key={item.href} className="relative group/nav">
                <Link
                  href={item.href}
                  className={`flex items-center justify-center w-9 h-9 mx-auto rounded transition-colors ${
                    active
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                >
                  {item.icon}
                </Link>
                {/* Tooltip */}
                <div
                  className="
                    pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                    px-2.5 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded shadow-lg
                    border border-zinc-700 whitespace-nowrap
                    opacity-0 group-hover/nav:opacity-100
                    transition-opacity duration-150
                  "
                >
                  {item.label}
                  {/* Tooltip arrow */}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
                </div>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                active
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span className={active ? 'text-white' : 'text-zinc-500'}>{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className={`border-t border-zinc-800 shrink-0 ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
        {collapsed ? (
          /* Collapsed: centered toggle button with tooltip */
          <div className="relative group/toggle">
            <button
              onClick={toggle}
              className="flex items-center justify-center w-9 h-9 mx-auto rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRightIcon />
            </button>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded shadow-lg border border-zinc-700 whitespace-nowrap opacity-0 group-hover/toggle:opacity-100 transition-opacity duration-150">
              Expand sidebar
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
            </div>
          </div>
        ) : (
          /* Expanded: version text + collapse button */
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">v0.7.0 · Enterprise</span>
            <button
              onClick={toggle}
              className="flex items-center justify-center w-6 h-6 rounded text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronLeftIcon />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
