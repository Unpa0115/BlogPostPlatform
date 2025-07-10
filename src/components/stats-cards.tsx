"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Play, CheckCircle, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"

interface Stats {
  total_uploads: number
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  active_platforms: number
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    total_uploads: 0,
    total_jobs: 0,
    completed_jobs: 0,
    failed_jobs: 0,
    active_platforms: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // localhost環境では認証チェックをスキップ
        const isLocalhost = typeof window !== 'undefined' && (
          window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' || 
          window.location.hostname.startsWith('192.168.')
        )

        const headers: Record<string, string> = {}
        
        if (!isLocalhost) {
          const token = localStorage.getItem('token')
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }
        }

        const response = await fetch('/api/stats', {
          headers
        })
        
        if (response.ok) {
          const data = await response.json()
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総アップロード数</CardTitle>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_uploads}</div>
          <p className="text-xs text-muted-foreground">
            アップロードされたファイル数
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">処理中ジョブ</CardTitle>
          <Play className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_jobs}</div>
          <p className="text-xs text-muted-foreground">
            実行中のジョブ数
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">完了ジョブ</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.completed_jobs}</div>
          <p className="text-xs text-muted-foreground">
            正常に完了したジョブ数
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">失敗ジョブ</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.failed_jobs}</div>
          <p className="text-xs text-muted-foreground">
            失敗したジョブ数
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 