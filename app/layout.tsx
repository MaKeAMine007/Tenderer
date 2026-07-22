import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AppShell } from '@/app/components/layout/AppShell'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MAM Tender Intelligence',
  description: 'Enterprise Tender Intelligence Platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
