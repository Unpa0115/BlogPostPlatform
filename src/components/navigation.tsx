"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Settings, Upload, Mic } from "lucide-react"

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: Home },
  { name: 'アップロード', href: '/upload', icon: Upload },
  { name: 'プラットフォーム', href: '/platforms', icon: Mic },
  { name: '設定', href: '/settings', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
              isActive ? "text-black dark:text-white" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline-block">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
} 