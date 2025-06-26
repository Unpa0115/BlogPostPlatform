"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { UploadForm } from "@/components/upload-form"
import { RecentUploads } from "@/components/recent-uploads"
import { StatsCards } from "@/components/stats-cards"
import { useAuth } from "@/contexts/auth-context"

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // リダイレクト中
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            音声ファイルのアップロードと配信管理を行います
          </p>
        </div>

        <StatsCards />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <UploadForm />
          <RecentUploads />
        </div>
      </div>
    </div>
  )
} 