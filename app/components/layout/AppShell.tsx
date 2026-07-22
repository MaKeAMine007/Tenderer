'use client'

import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { SidebarProvider } from './sidebar-context'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-full overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopHeader />
          <main className="flex-1 overflow-auto bg-zinc-50">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
