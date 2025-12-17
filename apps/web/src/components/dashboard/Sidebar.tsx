'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Code2, Home, Folder, Video, Settings, CreditCard, LogOut } from 'lucide-react'
import { SignOutButton } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/dashboard/projects', icon: Folder },
  { name: 'Recordings', href: '/dashboard/recordings', icon: Video },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
      <div className="flex flex-col flex-grow bg-slate-900 dark:bg-slate-950 overflow-y-auto border-r border-slate-800 dark:border-slate-900">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">RemoteDevAI</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 dark:bg-slate-900 text-white'
                    : 'text-slate-400 dark:text-slate-500 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="p-3 border-t border-slate-800 dark:border-slate-900">
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </div>

        {/* Sign out */}
        <div className="p-3">
          <SignOutButton>
            <button className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-800 dark:hover:bg-slate-900 hover:text-white transition-colors w-full">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
