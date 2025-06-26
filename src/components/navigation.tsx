"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Settings, Upload, Mic, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: Home },
  { name: 'アップロード', href: '/upload', icon: Upload },
  { name: 'プラットフォーム', href: '/platforms', icon: Mic },
  { name: '設定', href: '/settings', icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (!user) {
    return (
      <nav className="flex space-x-4 lg:space-x-6">
        <Link
          href="/login"
          className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <User className="h-4 w-4" />
          <span className="hidden md:inline-block">ログイン</span>
        </Link>
      </nav>
    )
  }

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
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-muted-foreground hidden md:inline-block">
          {user.email}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="flex items-center space-x-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline-block">ログアウト</span>
        </Button>
      </div>
    </nav>
  )
} 