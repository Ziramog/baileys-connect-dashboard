'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/connect', label: 'WhatsApp' },
  { href: '/leads', label: 'Leads' },
  { href: '/stats', label: 'Stats' },
  { href: '/settings', label: 'Settings' }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen bg-zinc-900 border-r border-zinc-800 fixed left-0 top-0 p-4">
      <h1 className="text-xl font-bold text-green-400 mb-8">Wolfim</h1>
      <nav className="space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 rounded-lg transition-colors ${
                active
                  ? 'bg-zinc-800 text-green-400'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}