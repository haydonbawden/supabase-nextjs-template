'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShieldCheck, Store, UserRound } from 'lucide-react'

type Props = {
  children: React.ReactNode
}

const nav = [
  { href: '/app', label: 'Overview', icon: Home },
  { href: '/app/staff', label: 'Staff', icon: UserRound },
  { href: '/app/venue', label: 'Venue', icon: Store },
  { href: '/app/admin', label: 'Admin', icon: ShieldCheck },
]

export default function AppLayout({ children }: Props) {
  const pathname = usePathname()
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-lg font-semibold">HospoShift WA</p>
            <p className="text-xs text-muted-foreground">Western Australia casual hospitality staffing marketplace</p>
          </div>
          <form action="/auth/login" method="get">
            <button className="rounded-md border px-3 py-1.5 text-sm">Auth</button>
          </form>
        </div>
      </header>
      <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3">
        {nav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm ${isActive ? 'bg-primary text-white' : 'bg-white border'}`}
            >
              <item.icon className="h-4 w-4" /> {item.label}
            </Link>
          )
        })}
      </nav>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  )
}
